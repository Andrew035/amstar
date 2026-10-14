package com.amstar.repair.service;

import com.amstar.repair.model.Technician;
import com.amstar.repair.model.User;
import com.amstar.repair.repository.TechnicianRepository;
import com.amstar.repair.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accounts, as the roster sees them.
 *
 * <p>Separate from PriorityQueueService because none of this is a ticket, and separate from
 * AuthController because changing someone's role is shop administration rather than signing in.
 *
 * <p>The hierarchy itself is not here. Who may outrank whom lives in {@link
 * com.amstar.repair.model.UserRole}, and the controller checks it before calling anything below -
 * this class does the writing, not the deciding.
 */
@Service
public class AccountService {

  private static final Logger log = LoggerFactory.getLogger(AccountService.class);

  private final UserRepository users;
  private final TechnicianRepository technicians;
  private final PasswordEncoder passwordEncoder;
  private final PasswordResetService credentialTokens;

  public AccountService(
      UserRepository users,
      TechnicianRepository technicians,
      PasswordEncoder passwordEncoder,
      PasswordResetService credentialTokens) {
    this.users = users;
    this.technicians = technicians;
    this.passwordEncoder = passwordEncoder;
    this.credentialTokens = credentialTokens;
  }

  /** What happened, so the caller can tell the admin whether the email actually went. */
  public record Invitation(User user, boolean emailed) {}

  /**
   * Gives a roster entry an account and mails them an invite.
   *
   * <p>The row is created inactive with an unusable password, so between this call and the invite
   * being accepted there is nothing to sign in to. That is the whole reason the invite exists
   * rather than an admin typing a password for someone: the password is only ever known to the
   * person who owns it.
   *
   * <p>The caller has already checked that the actor outranks {@code role} - this method writes,
   * it does not decide.
   */
  @Transactional
  public Invitation invite(Technician tech, String email, String role) {
    User user = new User();
    user.setEmail(email);
    user.setUsername(usernameFrom(email));
    // Unusable by construction: a random value nobody has ever seen, so the
    // only route in is the token. Hashed anyway, because password_hash is NOT
    // NULL and a recognisable placeholder would be a tell.
    user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
    user.setRole(role);
    user.setIsActive(false);
    User saved = users.save(user);

    tech.setUserId(saved.getId());
    technicians.save(tech);

    boolean emailed = credentialTokens.sendInvite(saved);
    log.info("Invited user id {} as {} for technician id {}", saved.getId(), role, tech.getId());
    return new Invitation(saved, emailed);
  }

  /**
   * Points a roster entry at an account that already exists.
   *
   * <p>The invite path is for someone who has never signed in. This is the other half: the owners
   * and the bookkeeper had accounts long before the roster could hold one, and without this their
   * names on the roster and their logins stay two unrelated things forever.
   *
   * <p>No token_version bump, deliberately. Linking changes who the roster row <em>describes</em>,
   * not what anybody may do - the role is untouched - so no session needs invalidating. The bump
   * belongs to changeRole alone.
   */
  @Transactional
  public void link(Technician tech, User user) {
    tech.setUserId(user.getId());
    technicians.save(tech);
    log.info("Linked technician id {} to user id {}", tech.getId(), user.getId());
  }

  /**
   * Switches an account off, or back on.
   *
   * <p>The missing half of "Remove from roster". That action sets
   * technicians.is_active, which only hides a name from the assignment lists - the account behind
   * it keeps working, which is the opposite of what removing someone looks like it does. Until this
   * existed nothing in the application could revoke access at all; the only route was SQL.
   *
   * <p>The token_version bump is what makes it immediate. is_active alone would leave the session
   * they are already holding alive for up to ten hours, and JwtAuthenticationFilter checks both on
   * every request - that is_active branch has been there since V1 with nothing to reject.
   */
  @Transactional
  public void setAccountActive(User target, boolean active) {
    target.setIsActive(active);
    target.setTokenVersion(target.getTokenVersion() + 1);
    users.save(target);
    log.info("Account id {} {}", target.getId(), active ? "restored" : "revoked");
  }

  /** Breaks the link without touching either side. Mistake recovery. */
  @Transactional
  public void unlink(Technician tech) {
    Long was = tech.getUserId();
    tech.setUserId(null);
    technicians.save(tech);
    log.info("Unlinked technician id {} from user id {}", tech.getId(), was);
  }

  /** Whether `userId` is already spoken for by some other roster entry. */
  public Optional<Technician> rosterEntryFor(Long userId) {
    return userId == null ? Optional.empty() : technicians.findByUserId(userId);
  }

  /** Re-mails an invite for an account that has not been claimed yet. */
  @Transactional
  public boolean reinvite(User user) {
    return credentialTokens.sendInvite(user);
  }

  /** Matches AuthController: the local part is the display name. */
  private static String usernameFrom(String email) {
    int at = email.indexOf('@');
    return at > 0 ? email.substring(0, at) : email;
  }

  public Optional<User> byEmail(String email) {
    return email == null ? Optional.empty() : users.findByEmail(email);
  }

  public Optional<User> byId(Long id) {
    return id == null ? Optional.empty() : users.findById(id);
  }

  /**
   * Writes a new role and bumps token_version, in one transaction.
   *
   * <p>The bump is not optional. The `tv` claim is the only revocation JwtAuthenticationFilter
   * checks, so without it a demoted account keeps the authority it just lost until its token
   * expires - up to ten hours later. This is the same half-of-the-change DEPLOY.md warns about for
   * the manual SQL path, and the same omission that was sitting in PasswordResetService.
   *
   * <p>No last-admin guard here, and that is deliberate rather than forgotten: {@code
   * UserRole.mayManage} requires the target to rank strictly below the actor, so an admin cannot
   * reach another admin at all, and the controller refuses to let anyone change their own role. The
   * two together mean no request can remove the final ADMIN. If either rule is ever relaxed, this
   * is where the count check belongs, because nothing in the app can grant ADMIN back.
   *
   * <p>The amount is not logged, only the id and the new role: the shop's activity feed is readable
   * by every signed-in account and a role change is not its business.
   */
  @Transactional
  public String changeRole(User target, String role) {
    String previous = target.getRole();
    target.setRole(role);
    target.setTokenVersion(target.getTokenVersion() + 1);
    users.save(target);
    log.info("Role of user id {} changed from {} to {}", target.getId(), previous, role);
    return role;
  }

  /**
   * Fills in the transient role on each roster entry.
   *
   * <p>One query for the whole roster rather than one per row. Entries with no account keep a null
   * role, which is what the roster renders as "no login".
   */
  public List<Technician> withRoles(List<Technician> roster) {
    List<Long> ids =
        roster.stream().map(Technician::getUserId).filter(Objects::nonNull).distinct().toList();
    if (ids.isEmpty()) {
      return roster;
    }
    Map<Long, User> byId =
        users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    roster.forEach(
        tech -> {
          User account = tech.getUserId() == null ? null : byId.get(tech.getUserId());
          tech.setRole(account == null ? null : account.getRole());
          tech.setAccountActive(account == null ? null : account.getIsActive());
        });
    return roster;
  }
}
