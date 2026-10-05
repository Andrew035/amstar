package com.amstar.repair.repository;

import com.amstar.repair.model.PasswordResetToken;
import com.amstar.repair.model.User;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
  Optional<PasswordResetToken> findByTokenHash(String tokenHash);

  /** Requesting a new link invalidates any earlier outstanding ones. */
  @Modifying
  @Query(
      "update PasswordResetToken t set t.usedAt = CURRENT_TIMESTAMP "
          + "where t.user = :user and t.usedAt is null")
  void invalidateOutstanding(User user);

  @Modifying
  void deleteByExpiresAtBefore(Instant cutoff);
}
