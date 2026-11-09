package edu.tesla.school.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    @Modifying
    @Query("delete from PasswordResetToken t where t.expiresAt < :cutoff or t.used = true")
    int deleteStale(Instant cutoff);

    @Modifying
    @Query("delete from PasswordResetToken t where t.user.id = :userId")
    void deleteByUserId(Long userId);
}
