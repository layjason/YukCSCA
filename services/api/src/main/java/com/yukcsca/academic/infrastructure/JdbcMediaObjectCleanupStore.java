package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.MediaObjectCleanupStore;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** PostgreSQL outbox for idempotent object deletion by the existing render worker. */
@Repository
public class JdbcMediaObjectCleanupStore implements MediaObjectCleanupStore {
  private final JdbcTemplate jdbc;

  public JdbcMediaObjectCleanupStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void schedule(String storageKey, Instant deleteAfter, Reason reason) {
    upsert(storageKey, deleteAfter, reason);
  }

  @Override
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void protectBeforeExternalWrite(String storageKey, Instant deleteAfter, Reason reason) {
    upsert(storageKey, deleteAfter, reason);
  }

  @Override
  public void cancel(String storageKey) {
    jdbc.update("delete from media_object_cleanup where storage_key = ?", storageKey);
  }

  @Override
  public boolean reserveValidationRetry(String storageKey, Instant now) {
    return jdbc
        .query(
            """
            select delete_after, claim_token
            from media_object_cleanup
            where storage_key = ?
            for update
            """,
            (result, row) ->
                result.getTimestamp("delete_after").toInstant().isAfter(now)
                    && result.getObject("claim_token") == null,
            storageKey)
        .stream()
        .findFirst()
        .orElse(false);
  }

  private void upsert(String storageKey, Instant deleteAfter, Reason reason) {
    jdbc.update(
        """
        insert into media_object_cleanup
          (id, storage_key, delete_after, attempts, reason, created_at, updated_at)
        values (?, ?, ?, 0, ?, now(), now())
        on conflict (storage_key) do update
          set delete_after = least(media_object_cleanup.delete_after, excluded.delete_after),
              reason = excluded.reason,
              updated_at = now()
        """,
        UUID.randomUUID(),
        storageKey,
        Timestamp.from(deleteAfter),
        reason.name());
  }
}
