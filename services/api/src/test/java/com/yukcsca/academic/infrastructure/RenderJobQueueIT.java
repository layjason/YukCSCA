package com.yukcsca.academic.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.application.MediaObjectCleanupStore;
import com.yukcsca.support.PostgresTestConfiguration;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Polled render-queue semantics on the real schema (VS-010B): the worker's exact claim SQL with FOR
 * UPDATE SKIP LOCKED hands different jobs to concurrent workers, expired RUNNING claims return to
 * the pool, requeued jobs are retried, and terminal jobs never re-enter the queue (AC-10).
 */
@ActiveProfiles("test")
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class RenderJobQueueIT {
  private static final String CLAIM_SQL =
      """
      UPDATE render_job
      SET state = 'RUNNING', attempts = attempts + 1,
          visible_after = now() + make_interval(secs => %s),
          updated_at = now()
      WHERE id = (
          SELECT id FROM render_job
          WHERE ((state = 'QUEUED' AND visible_after <= now())
                 OR (state = 'RUNNING' AND visible_after < now()))
            AND attempts < %s
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
      )
      RETURNING id, attempts
      """;
  private static final String EXPIRE_EXHAUSTED_SQL =
      """
      UPDATE render_job
      SET state = 'FAILED', error_code = 'RENDER_TIMEOUT',
          error_detail = 'worker visibility lease expired after final attempt',
          visible_after = now(), updated_at = now()
      WHERE attempts >= 3
        AND ((state = 'QUEUED' AND visible_after <= now())
             OR (state = 'RUNNING' AND visible_after < now()))
      """;
  private static final String CLEANUP_CLAIM_SQL =
      """
      update media_object_cleanup
      set attempts = attempts + 1, delete_after = now() + interval '5 minutes',
          claim_token = gen_random_uuid(), updated_at = now()
      where id = (
        select cleanup.id from media_object_cleanup cleanup
        where cleanup.delete_after <= now()
          and not exists (
            select 1 from academic_video_asset asset
            join render_job job on job.video_asset_id = asset.id
            where asset.storage_key = cleanup.storage_key
              and asset.status = 'AWAITING_VALIDATION'
              and job.state in ('QUEUED', 'RUNNING')
          )
        order by cleanup.delete_after, cleanup.created_at
        for update skip locked limit 1
      )
      returning id
      """;

  @Autowired JdbcTemplate jdbc;
  @Autowired DataSource dataSource;
  @Autowired MediaObjectCleanupStore cleanup;
  @Autowired PlatformTransactionManager transactions;

  @BeforeEach
  void setUp() {
    jdbc.execute(
        "truncate table media_object_cleanup, render_job, academic_video_upload_slot, academic_video_asset, "
            + "scene_specification, student_content_progress, academic_audit, academic_image, "
            + "academic_revision, academic_package, user_account cascade");
  }

  @Test
  void concurrentWorkersClaimDistinctJobsAndTerminalJobsNeverRequeue() throws Exception {
    UUID admin = adminUser();
    UUID first = enqueueJob(admin, "2026-08-01T00:00:00Z");
    UUID second = enqueueJob(admin, "2026-08-01T00:01:00Z");

    try (Connection workerA = dataSource.getConnection();
        Connection workerB = dataSource.getConnection()) {
      workerA.setAutoCommit(false);
      workerB.setAutoCommit(false);

      // Two live claims in overlapping transactions receive different jobs (SKIP LOCKED).
      Claimed claimA = claim(workerA);
      Claimed claimB = claim(workerB);
      assertThat(claimA.id()).isEqualTo(first);
      assertThat(claimB.id()).isEqualTo(second);
      assertThat(claimA.attempts()).isEqualTo(1);
      workerA.commit();
      workerB.commit();

      // The queue is drained: no further claim until one is requeued.
      try (Connection workerC = dataSource.getConnection()) {
        workerC.setAutoCommit(false);
        assertThat(claim(workerC)).isNull();
        workerC.rollback();
      }

      // A delayed requeue is not claimable before visible_after.
      jdbc.update(
          "update render_job set state = 'QUEUED', visible_after = now() + interval '1 hour' "
              + "where id = ?",
          ps -> ps.setObject(1, first));
      try (Connection workerD = dataSource.getConnection()) {
        workerD.setAutoCommit(false);
        assertThat(claim(workerD)).isNull();
        workerD.rollback();
      }

      // Once the delay expires, the same job is claimable and increments attempts.
      jdbc.update(
          "update render_job set visible_after = now() - interval '1 second' where id = ?",
          ps -> ps.setObject(1, first));
      try (Connection workerD = dataSource.getConnection()) {
        workerD.setAutoCommit(false);
        Claimed retried = claim(workerD);
        assertThat(retried.id()).isEqualTo(first);
        assertThat(retried.attempts()).isEqualTo(2);
        workerD.commit();
      }

      // An expired RUNNING claim (worker died) returns to the pool after visible_after.
      jdbc.update(
          "update render_job set state = 'RUNNING', visible_after = now() - interval '1 second' "
              + "where id = ?",
          ps -> ps.setObject(1, second));
      try (Connection workerE = dataSource.getConnection()) {
        workerE.setAutoCommit(false);
        Claimed recovered = claim(workerE);
        assertThat(recovered.id()).isEqualTo(second);
        assertThat(recovered.attempts()).isEqualTo(2);
        workerE.commit();
      }

      // A stale first attempt cannot overwrite the newer second attempt.
      assertThat(
              jdbc.update(
                  "update render_job set state = 'FAILED', error_code = 'INTERNAL' "
                      + "where id = ? and state = 'RUNNING' and attempts = 1",
                  ps -> ps.setObject(1, second)))
          .isZero();
      assertThat(
              jdbc.queryForObject(
                  "select attempts from render_job where id = ?", Integer.class, second))
          .isEqualTo(2);

      // A worker that dies after its final attempt is terminalized instead of remaining RUNNING
      // forever or incrementing beyond the database attempt bound.
      jdbc.update(
          "update render_job set attempts = 3, state = 'RUNNING', "
              + "visible_after = now() - interval '1 second' where id = ?",
          ps -> ps.setObject(1, second));
      jdbc.update(EXPIRE_EXHAUSTED_SQL);
      assertThat(
              jdbc.queryForObject(
                  "select state from render_job where id = ?", String.class, second))
          .isEqualTo("FAILED");

      // Terminal failure with its bounded reason code is never claimed again.
      jdbc.update(
          "update render_job set state = 'FAILED', error_code = 'DURATION_POLICY', "
              + "error_detail = 'total narration duration exceeds 600s' where id = ?",
          ps -> ps.setObject(1, first));
      try (Connection workerF = dataSource.getConnection()) {
        workerF.setAutoCommit(false);
        assertThat(claim(workerF)).isNull();
        workerF.rollback();
      }

      // And a FAILED job has no asset to show for it (AC-10: terminal failure creates no asset).
      Integer assets =
          jdbc.queryForObject(
              "select count(*) from academic_video_asset where storage_key like 'videos/%'",
              Integer.class);
      assertThat(assets).isZero();
    }
  }

  @Test
  void dueMediaCleanupUsesAttemptFencingAndLeavesFutureRowsAlone() throws Exception {
    UUID due = UUID.randomUUID();
    UUID future = UUID.randomUUID();
    jdbc.update(
        """
        insert into media_object_cleanup
          (id, storage_key, delete_after, attempts, reason, created_at, updated_at)
        values (?, 'video-uploads/due', now() - interval '1 second', 0, 'STAGING', now(), now()),
               (?, 'video-uploads/future', now() + interval '24 hours', 0, 'STAGING', now(), now())
        """,
        due,
        future);

    UUID claimed = jdbc.queryForObject(CLEANUP_CLAIM_SQL, UUID.class);

    assertThat(claimed).isEqualTo(due);
    assertThat(
            jdbc.update("delete from media_object_cleanup where id = ? and attempts = 0", claimed))
        .isZero();
    assertThat(
            jdbc.update("delete from media_object_cleanup where id = ? and attempts = 1", claimed))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from media_object_cleanup where id = ?", Integer.class, future))
        .isEqualTo(1);
  }

  @Test
  void dueStagingCleanupWaitsForActiveValidationJob() {
    UUID admin = adminUser();
    UUID assetId = UUID.randomUUID();
    String storageKey = "video-uploads/active-validation";
    jdbc.update(
        """
        insert into academic_video_asset (
          id, source, status, explanation_language, media_type, storage_key,
          captions_available, origin, author_user_id, created_at, updated_at
        ) values (?, 'UPLOADED', 'AWAITING_VALIDATION', 'id', 'video/mp4', ?, false,
                  'YUKCSCA_ORIGINAL', ?, now(), now())
        """,
        assetId,
        storageKey,
        admin);
    UUID jobId = UUID.randomUUID();
    jdbc.update(
        """
        insert into render_job (
          id, kind, state, video_asset_id, attempts, visible_after, created_at, updated_at
        ) values (?, 'VALIDATE_UPLOAD', 'QUEUED', ?, 0, now(), now(), now())
        """,
        jobId,
        assetId);
    jdbc.update(
        """
        insert into media_object_cleanup (
          id, storage_key, delete_after, attempts, reason, created_at, updated_at
        ) values (?, ?, now() - interval '1 second', 0, 'STAGING', now(), now())
        """,
        UUID.randomUUID(),
        storageKey);

    assertThat(jdbc.query(CLEANUP_CLAIM_SQL, (rs, row) -> rs.getObject(1, UUID.class))).isEmpty();

    jdbc.update(
        """
        update render_job set state = 'FAILED', error_code = 'INTERNAL', updated_at = now()
        where id = ?
        """,
        jobId);
    assertThat(jdbc.queryForObject(CLEANUP_CLAIM_SQL, UUID.class)).isNotNull();
    assertThat(cleanup.reserveValidationRetry(storageKey, Instant.now())).isFalse();
    assertThat(cleanup.reserveValidationRetry("video-uploads/missing", Instant.now())).isFalse();
  }

  @Test
  void activeValidationJobIsUniquePerAsset() {
    UUID admin = adminUser();
    UUID assetId = UUID.randomUUID();
    jdbc.update(
        """
        insert into academic_video_asset (
          id, source, status, explanation_language, media_type, storage_key,
          captions_available, origin, author_user_id, created_at, updated_at
        ) values (?, 'UPLOADED', 'AWAITING_VALIDATION', 'id', 'video/mp4', ?, false,
                  'YUKCSCA_ORIGINAL', ?, now(), now())
        """,
        assetId,
        "video-uploads/unique-validation",
        admin);
    jdbc.update(
        """
        insert into render_job (
          id, kind, state, video_asset_id, attempts, visible_after, created_at, updated_at
        ) values (?, 'VALIDATE_UPLOAD', 'QUEUED', ?, 0, now(), now(), now())
        """,
        UUID.randomUUID(),
        assetId);

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into render_job (
                      id, kind, state, video_asset_id, attempts, visible_after,
                      created_at, updated_at
                    ) values (?, 'VALIDATE_UPLOAD', 'RUNNING', ?, 1, now(), now(), now())
                    """,
                    UUID.randomUUID(),
                    assetId))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }

  @Test
  void externalWriteProtectionSurvivesOuterTransactionRollback() {
    String key = "videos/orphan/captions.vtt";
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () ->
                new TransactionTemplate(transactions)
                    .executeWithoutResult(
                        ignored -> {
                          cleanup.protectBeforeExternalWrite(
                              key,
                              Instant.now().plusSeconds(86_400),
                              MediaObjectCleanupStore.Reason.ORPHAN_OUTPUT);
                          throw new IllegalStateException("simulate metadata rollback");
                        }))
        .isInstanceOf(IllegalStateException.class);

    assertThat(
            jdbc.queryForObject(
                "select count(*) from media_object_cleanup where storage_key = ?",
                Integer.class,
                key))
        .isEqualTo(1);
  }

  private record Claimed(UUID id, int attempts) {}

  private Claimed claim(Connection connection) throws Exception {
    try (PreparedStatement statement =
        connection.prepareStatement(CLAIM_SQL.formatted("600", "3"))) {
      try (ResultSet result = statement.executeQuery()) {
        if (!result.next()) return null;
        return new Claimed(UUID.fromString(result.getString(1)), result.getInt(2));
      }
    }
  }

  private UUID enqueueJob(UUID admin, String createdAt) {
    UUID specId = UUID.randomUUID();
    Instant created = Instant.parse(createdAt);
    jdbc.update(
        "insert into scene_specification (id, explanation_language, registry_version, segments, "
            + "created_by_user_id, created_at, updated_at) values (?, 'id', '2026-08.1', "
            + "'[]'::jsonb, ?, ?, ?)",
        specId,
        admin,
        java.sql.Timestamp.from(created),
        java.sql.Timestamp.from(created));
    UUID jobId = UUID.randomUUID();
    jdbc.update(
        "insert into render_job (id, kind, state, scene_specification_id, scene_snapshot, "
            + "registry_version, attempts, visible_after, created_at, updated_at) values "
            + "(?, 'RENDER_SCENE', 'QUEUED', ?, ?::jsonb, '2026-08.1', 0, now(), now(), now())",
        jobId,
        specId,
        "{\"explanationLanguage\":\"id\",\"segments\":[]}");
    return jobId;
  }

  private UUID adminUser() {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "insert into user_account (id, email, display_name, role, onboarding_completed, "
            + "created_at, updated_at) values (?, 'queue-admin@example.com', 'Queue Admin', "
            + "'ADMIN', true, now(), now())",
        id);
    return id;
  }
}
