"""PostgreSQL-polled render-job queue access (psycopg 3).

Workers claim exactly one job per transaction with ``FOR UPDATE SKIP LOCKED``
over the partial claimable index, so multiple worker processes never block each
other or double-claim. A claim sets ``RUNNING`` and pushes ``visible_after``
into the future (visibility timeout); a claim that expires without completion
is re-claimable until the attempts bound is exhausted.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

CLAIM_SQL = """
UPDATE render_job
SET state = 'RUNNING',
    attempts = attempts + 1,
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
RETURNING id, kind, scene_specification_id, video_asset_id, scene_snapshot,
          registry_version, attempts
"""


class StaleClaim(Exception):
    """The worker attempt lost its visibility lease and may no longer mutate job state."""


@dataclass(frozen=True)
class ClaimedJob:
    id: str
    kind: str
    scene_specification_id: Optional[str]
    video_asset_id: Optional[str]
    scene_snapshot: Optional[str]
    registry_version: Optional[str]
    attempts: int

    def snapshot_dict(self) -> dict[str, Any]:
        if not self.scene_snapshot:
            return {}
        return json.loads(self.scene_snapshot)


@dataclass(frozen=True)
class CleanupClaim:
    id: str
    storage_key: str
    attempts: int
    claim_token: str


def claim_cleanup(conn) -> Optional[CleanupClaim]:
    """Claims one due deletion and moves its lease five minutes into the future."""
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE media_object_cleanup
            SET attempts = attempts + 1, delete_after = now() + interval '5 minutes',
                claim_token = gen_random_uuid(), updated_at = now()
            WHERE id = (
                SELECT cleanup.id FROM media_object_cleanup cleanup
                WHERE cleanup.delete_after <= now()
                  AND NOT EXISTS (
                    SELECT 1
                    FROM academic_video_asset asset
                    JOIN render_job job ON job.video_asset_id = asset.id
                    WHERE asset.storage_key = cleanup.storage_key
                      AND asset.status = 'AWAITING_VALIDATION'
                      AND job.state IN ('QUEUED', 'RUNNING')
                  )
                ORDER BY cleanup.delete_after, cleanup.created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING id, storage_key, attempts, claim_token
            """
        )
        row = cursor.fetchone()
    conn.commit()
    if row is None:
        return None
    return CleanupClaim(str(row[0]), row[1], int(row[2]), str(row[3]))


def complete_cleanup(conn, claim: CleanupClaim) -> bool:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM media_object_cleanup
            WHERE id = %s::uuid AND claim_token = %s::uuid
            """,
            (claim.id, claim.claim_token),
        )
        changed = cursor.rowcount == 1
    conn.commit()
    return changed


def release_cleanup(conn, claim: CleanupClaim) -> bool:
    """Releases a failed S3 deletion; the row becomes claimable after its five-minute backoff."""
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE media_object_cleanup
            SET claim_token = NULL, updated_at = now()
            WHERE id = %s::uuid AND claim_token = %s::uuid
            """,
            (claim.id, claim.claim_token),
        )
        changed = cursor.rowcount == 1
    conn.commit()
    return changed


def schedule_cleanup(conn, storage_keys: list[str], delay_seconds: int, reason: str) -> None:
    """Durably protects uploaded outputs from becoming untracked object-store orphans."""
    with conn.cursor() as cursor:
        for storage_key in storage_keys:
            cursor.execute(
                """
                INSERT INTO media_object_cleanup
                  (id, storage_key, delete_after, attempts, reason, created_at, updated_at)
                VALUES (gen_random_uuid(), %s, now() + make_interval(secs => %s), 0, %s,
                        now(), now())
                ON CONFLICT (storage_key) DO UPDATE
                  SET delete_after = LEAST(media_object_cleanup.delete_after,
                                           EXCLUDED.delete_after),
                      reason = EXCLUDED.reason,
                      updated_at = now()
                """,
                (storage_key, delay_seconds, reason),
            )
    conn.commit()


def claim_next(
    conn, visibility_timeout_seconds: int, max_attempts: int
) -> Optional[ClaimedJob]:
    with conn.cursor() as cursor:
        # A worker that died after its final claim cannot leave a RUNNING row forever. Expire it
        # terminally before selecting another job; the claim query itself never increments beyond
        # the schema's bounded attempt count.
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'FAILED', error_code = 'RENDER_TIMEOUT',
                error_detail = 'worker visibility lease expired after final attempt',
                visible_after = now(), updated_at = now()
            WHERE attempts >= %s
              AND ((state = 'QUEUED' AND visible_after <= now())
                   OR (state = 'RUNNING' AND visible_after < now()))
            """,
            (max_attempts,),
        )
        cursor.execute(CLAIM_SQL, (visibility_timeout_seconds, max_attempts))
        row = cursor.fetchone()
        if row is None:
            conn.commit()
            return None
        conn.commit()
        return ClaimedJob(
            id=str(row[0]),
            kind=row[1],
            scene_specification_id=str(row[2]) if row[2] else None,
            video_asset_id=str(row[3]) if row[3] else None,
            scene_snapshot=row[4],
            registry_version=row[5],
            attempts=int(row[6]),
        )


def requeue(conn, job_id: str, attempt: int, backoff_seconds: int) -> bool:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'QUEUED', visible_after = now() + make_interval(secs => %s),
                updated_at = now()
            WHERE id = %s::uuid AND state = 'RUNNING' AND attempts = %s
            """,
            (backoff_seconds, job_id, attempt),
        )
        changed = cursor.rowcount == 1
    conn.commit()
    return changed


def fail(
    conn,
    job_id: str,
    attempt: int,
    error_code: str,
    detail: str,
) -> bool:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'FAILED', error_code = %s, error_detail = LEFT(%s, 500),
                visible_after = now(), updated_at = now()
            WHERE id = %s::uuid AND state = 'RUNNING' AND attempts = %s
            """,
            (error_code, detail, job_id, attempt),
        )
        changed = cursor.rowcount == 1
    conn.commit()
    return changed


def load_asset(conn, asset_id: str) -> Optional[dict[str, Any]]:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, source, status, explanation_language, storage_key, captions_key
            FROM academic_video_asset WHERE id = %s::uuid
            """,
            (asset_id,),
        )
        row = cursor.fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "source": row[1],
        "status": row[2],
        "explanation_language": row[3],
        "storage_key": row[4],
        "captions_key": row[5],
    }


def complete_upload_validation(
    conn,
    job_id: str,
    attempt: int,
    asset_id: str,
    staging_key: str,
    storage_key: str,
    byte_size: int,
    duration_seconds: int,
    width: int,
    height: int,
    sha256: str,
    captions_available: bool,
    captions_key: Optional[str],
) -> None:
    """Atomically moves an upload to DRAFT and completes only the current job attempt."""
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE academic_video_asset
            SET status = 'DRAFT', storage_key = %s, byte_size = %s, duration_seconds = %s,
                width = %s, height = %s, sha256 = %s,
                captions_available = %s, captions_key = COALESCE(%s, captions_key),
                updated_at = now()
            WHERE id = %s::uuid AND status = 'AWAITING_VALIDATION'
            """,
            (
                storage_key,
                byte_size,
                duration_seconds,
                width,
                height,
                sha256,
                captions_available,
                captions_key,
                asset_id,
            ),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            raise StaleClaim(f"upload asset {asset_id} is no longer awaiting validation")
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'SUCCEEDED', error_code = NULL, error_detail = NULL,
                visible_after = now(), updated_at = now()
            WHERE id = %s::uuid AND state = 'RUNNING' AND attempts = %s
            """,
            (job_id, attempt),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            raise StaleClaim(f"job {job_id} attempt {attempt} lost its lease")
        cursor.execute(
            "DELETE FROM media_object_cleanup WHERE storage_key = %s",
            (storage_key,),
        )
        cursor.execute(
            """
            UPDATE media_object_cleanup
            SET delete_after = now(), reason = 'STAGING', updated_at = now()
            WHERE storage_key = %s
            """,
            (staging_key,),
        )
    conn.commit()


def complete_upload_rejection(
    conn,
    job_id: str,
    attempt: int,
    asset_id: str,
    violations: list[tuple[str, str]],
) -> None:
    """Atomically records a bounded rejection and completes only the current attempt."""
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE academic_video_asset
            SET status = 'REJECTED', rejection = %s::jsonb, updated_at = now()
            WHERE id = %s::uuid AND status = 'AWAITING_VALIDATION'
            """,
            (
                json.dumps(
                    [{"path": path, "code": code} for path, code in violations]
                ),
                asset_id,
            ),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            raise StaleClaim(f"upload asset {asset_id} is no longer awaiting validation")
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'SUCCEEDED', error_code = NULL, error_detail = NULL,
                visible_after = now(), updated_at = now()
            WHERE id = %s::uuid AND state = 'RUNNING' AND attempts = %s
            """,
            (job_id, attempt),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            raise StaleClaim(f"job {job_id} attempt {attempt} lost its lease")
        cursor.execute(
            """
            UPDATE media_object_cleanup
            SET delete_after = now(), reason = 'REJECTED_UPLOAD', updated_at = now()
            WHERE storage_key = (
                SELECT storage_key FROM academic_video_asset WHERE id = %s::uuid
            )
            """,
            (asset_id,),
        )
    conn.commit()


def complete_render(
    conn,
    job_id: str,
    attempt: int,
    asset_id: str,
    scene_specification_id: str,
    explanation_language: str,
    storage_key: str,
    byte_size: int,
    duration_seconds: int,
    width: int,
    height: int,
    sha256: str,
    captions_key: str,
) -> None:
    """Atomically creates a PRODUCED Draft asset and completes the current attempt.

    Provenance attributes the production to the script's author; origin is
    YUKCSCA_ORIGINAL because narration originates from the reviewed script.
    """

    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_video_asset (
                id, source, status, explanation_language, media_type, storage_key,
                captions_key, byte_size, duration_seconds, width, height, sha256,
                captions_available, origin, author_user_id, created_at, updated_at
            ) VALUES (
                %s::uuid, 'PRODUCED', 'DRAFT', %s, 'video/mp4', %s, %s,
                %s, %s, %s, %s, %s, true, 'YUKCSCA_ORIGINAL',
                (SELECT created_by_user_id FROM scene_specification WHERE id = %s::uuid),
                now(), now()
            )
            """,
            (
                asset_id,
                explanation_language,
                storage_key,
                captions_key,
                byte_size,
                duration_seconds,
                width,
                height,
                sha256,
                scene_specification_id,
            ),
        )
        cursor.execute(
            """
            UPDATE render_job
            SET state = 'SUCCEEDED', video_asset_id = %s::uuid,
                error_code = NULL, error_detail = NULL, visible_after = now(), updated_at = now()
            WHERE id = %s::uuid AND state = 'RUNNING' AND attempts = %s
            """,
            (asset_id, job_id, attempt),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            raise StaleClaim(f"job {job_id} attempt {attempt} lost its lease")
        cursor.execute(
            "DELETE FROM media_object_cleanup WHERE storage_key IN (%s, %s)",
            (storage_key, captions_key),
        )
    conn.commit()
