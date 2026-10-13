package com.amstar.repair.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

  /** Choosing a new password for an account that already works. */
  public static final String RESET = "RESET";

  /** Choosing the first password for an account that is waiting to be claimed. */
  public static final String INVITE = "INVITE";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "used_at")
  private Instant usedAt;

  /**
   * Which door this token opens, RESET or INVITE (V20).
   *
   * <p>One table serves both because "set your first password" and "set a new password" are the
   * same mechanic - one expiry, one single-use rule, one purge job. The column is what stops them
   * being interchangeable: an invite redeemed at /reset-password would set a password and leave
   * is_active false, which is a confusing dead end rather than a way in.
   */
  @Column(nullable = false, length = 16)
  private String purpose = RESET;

  public PasswordResetToken() {
  }

  public PasswordResetToken(User user, String tokenHash, Instant expiresAt) {
    this(user, tokenHash, expiresAt, RESET);
  }

  public PasswordResetToken(User user, String tokenHash, Instant expiresAt, String purpose) {
    this.user = user;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.purpose = purpose;
  }

  /** Unused and unexpired. */
  public boolean isRedeemable() {
    return usedAt == null && Instant.now().isBefore(expiresAt);
  }

  /** Unused, unexpired, and the kind of token the caller is redeeming. */
  public boolean isRedeemableAs(String expected) {
    return isRedeemable() && expected != null && expected.equals(purpose);
  }

  public String getPurpose() {
    return purpose;
  }

  public void setPurpose(String purpose) {
    this.purpose = purpose;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }

  public String getTokenHash() {
    return tokenHash;
  }

  public void setTokenHash(String tokenHash) {
    this.tokenHash = tokenHash;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public Instant getUsedAt() {
    return usedAt;
  }

  public void setUsedAt(Instant usedAt) {
    this.usedAt = usedAt;
  }
}
