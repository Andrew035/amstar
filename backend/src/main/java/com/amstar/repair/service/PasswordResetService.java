package com.amstar.repair.service;

import com.amstar.repair.model.PasswordResetToken;
import com.amstar.repair.model.User;
import com.amstar.repair.repository.PasswordResetTokenRepository;
import com.amstar.repair.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

  private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
  private static final SecureRandom RANDOM = new SecureRandom();

  private final UserRepository users;
  private final PasswordResetTokenRepository tokens;
  private final PasswordEncoder passwordEncoder;
  private final JavaMailSender mailSender;
  private final String appUrl;
  private final long tokenMinutes;
  private final String fromAddress;

  public PasswordResetService(
      UserRepository users,
      PasswordResetTokenRepository tokens,
      PasswordEncoder passwordEncoder,
      JavaMailSender mailSender,
      @Value("${amstar.app-url}") String appUrl,
      @Value("${amstar.auth.reset-token-minutes:30}") long tokenMinutes,
      @Value("${spring.mail.username}") String fromAddress) {
    this.users = users;
    this.tokens = tokens;
    this.passwordEncoder = passwordEncoder;
    this.mailSender = mailSender;
    this.appUrl = appUrl;
    this.tokenMinutes = tokenMinutes;
    this.fromAddress = fromAddress;
  }

  /**
   * Always succeeds from the caller's point of view. Whether the address is registered is not
   * disclosed - otherwise this endpoint becomes a way to enumerate who has an account.
   */
  @Transactional
  public void requestReset(String email) {
    Optional<User> match = users.findByEmail(email);
    if (match.isEmpty() || !Boolean.TRUE.equals(match.get().getIsActive())) {
      log.info("Password reset requested for unknown or inactive address");
      return;
    }
    User user = match.get();

    tokens.invalidateOutstanding(user);

    byte[] raw = new byte[32];
    RANDOM.nextBytes(raw);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

    tokens.save(
        new PasswordResetToken(
            user, hash(token), Instant.now().plus(tokenMinutes, ChronoUnit.MINUTES)));

    try {
      send(user.getEmail(), token);
    } catch (Exception e) {
      // A mail failure must not change the response. A 500 here against a 200
      // for an unknown address is precisely the enumeration oracle this
      // endpoint exists to prevent. Log it loudly and still return 200.
      log.error("Failed to send password reset email", e);
    }
  }

  /**
   * @return true if the token was valid and the password was changed.
   */
  @Transactional
  public boolean resetPassword(String token, String newPassword) {
    if (token == null || newPassword == null || newPassword.length() < 8) {
      return false;
    }
    Optional<PasswordResetToken> match = tokens.findByTokenHash(hash(token));
    if (match.isEmpty() || !match.get().isRedeemableAs(PasswordResetToken.RESET)) {
      return false;
    }
    PasswordResetToken resetToken = match.get();

    User user = resetToken.getUser();
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setTokenVersion(user.getTokenVersion() + 1);
    users.save(user);

    resetToken.setUsedAt(Instant.now());
    tokens.save(resetToken);

    log.info("Password reset completed for user id {}", user.getId());
    return true;
  }

  /**
   * Mints an invite token for an account that is waiting to be claimed and mails the link.
   *
   * @return false if the token was stored but the email could not be sent, so the caller can tell
   *     the admin to try again. Unlike a password reset - where silence is the point, because the
   *     response must not disclose whether an address is registered - an invite is an action a
   *     signed-in manager just took, and they are the only person who can fix a bounce.
   */
  @Transactional
  public boolean sendInvite(User user) {
    tokens.invalidateOutstanding(user);

    byte[] raw = new byte[32];
    RANDOM.nextBytes(raw);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

    tokens.save(
        new PasswordResetToken(
            user,
            hash(token),
            Instant.now().plus(tokenMinutes, ChronoUnit.MINUTES),
            PasswordResetToken.INVITE));

    try {
      sendInviteEmail(user.getEmail(), token);
      return true;
    } catch (Exception e) {
      log.error("Failed to send invite email to user id {}", user.getId(), e);
      return false;
    }
  }

  /**
   * Claims an invited account: first password, and the account goes live.
   *
   * <p>This is separate from resetPassword because it is the only path that may flip is_active, and
   * that distinction matters: requestReset refuses inactive accounts on purpose, so an account
   * deactivated by a manager cannot be revived through the reset flow. Only an unredeemed invite
   * activates anything.
   *
   * <p>The token_version bump is here for the same reason it is in resetPassword - if an invite is
   * ever re-issued, any token minted against the half-set-up account stops working.
   */
  @Transactional
  public boolean acceptInvite(String token, String newPassword) {
    if (token == null || newPassword == null || newPassword.length() < 8) {
      return false;
    }
    Optional<PasswordResetToken> match = tokens.findByTokenHash(hash(token));
    if (match.isEmpty() || !match.get().isRedeemableAs(PasswordResetToken.INVITE)) {
      return false;
    }
    PasswordResetToken invite = match.get();

    User user = invite.getUser();
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setIsActive(true);
    user.setTokenVersion(user.getTokenVersion() + 1);
    users.save(user);

    invite.setUsedAt(Instant.now());
    tokens.save(invite);

    log.info("Invite accepted for user id {}", user.getId());
    return true;
  }

  private void sendInviteEmail(String to, String token) {
    String link = appUrl + "/accept-invite?token=" + token;
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(to);
    message.setSubject("AM Star - your account");
    message.setText(
        """
        You have been given an account on the AM Star shop manager.

        Open this link to choose your password (expires in %d minutes):

        %s

        If you were not expecting this, ignore this email - the account
        cannot be used until that link is opened.
        """
            .formatted(tokenMinutes, link));
    mailSender.send(message);
  }

  private void send(String to, String token) {
    String link = appUrl + "/reset-password?token=" + token;
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(to);
    message.setSubject("AM Star - password reset");
    message.setText(
        """
        Someone asked to reset the password for this AM Star account.

        Open this link to choose a new password (expires in %d minutes):

        %s

        If this wasn't you, ignore this email - nothing has changed.
        """
            .formatted(tokenMinutes, link));
    mailSender.send(message);
  }

  /** SHA-256 hex. The raw token exists only in the email. */
  private static String hash(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
  }

  // Spent and expired rows are dead weight that still record who reset when.
  @Scheduled(cron = "0 30 3 * * *")
  @Transactional
  public void purgeStaleTokens() {
    tokens.deleteByExpiresAtBefore(Instant.now().minus(7, ChronoUnit.DAYS));
  }
}
