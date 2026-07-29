package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.PasswordRecoveryEmailOutboxStore;
import com.yukcsca.identity.domain.PasswordRecoveryEmailOutbox;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordRecoveryEmailOutboxRepository
    extends JpaRepository<PasswordRecoveryEmailOutbox, UUID>, PasswordRecoveryEmailOutboxStore {
  @Override
  @Query(
      value =
          "select * from password_recovery_email_outbox "
              + "where status = 'QUEUED' and next_attempt_at <= :now "
              + "order by next_attempt_at for update skip locked limit :limit",
      nativeQuery = true)
  List<PasswordRecoveryEmailOutbox> findDueForUpdate(
      @Param("now") Instant now, @Param("limit") int limit);
}
