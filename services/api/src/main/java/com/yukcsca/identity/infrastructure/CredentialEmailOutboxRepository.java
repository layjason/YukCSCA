package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.CredentialEmailOutboxStore;
import com.yukcsca.identity.domain.CredentialEmailOutbox;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CredentialEmailOutboxRepository
    extends JpaRepository<CredentialEmailOutbox, UUID>, CredentialEmailOutboxStore {
  @Override
  @Query(
      value =
          "select * from credential_email_outbox "
              + "where status = 'QUEUED' and next_attempt_at <= :now "
              + "order by next_attempt_at for update skip locked limit :limit",
      nativeQuery = true)
  List<CredentialEmailOutbox> findDueForUpdate(
      @Param("now") Instant now, @Param("limit") int limit);
}
