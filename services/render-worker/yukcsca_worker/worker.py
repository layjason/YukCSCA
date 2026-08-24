"""Render-worker main loop.

Claims one job at a time from the PostgreSQL-polled queue (FOR UPDATE SKIP
LOCKED), executes it in a child process with a hard timeout, and applies the
bounded retry policy: transient failures requeue with linear backoff until the
attempts bound is exhausted, then the job fails terminally with a bounded error
code and detail. Terminal failures create no asset (AC-10); the text unit and
package publication are never blocked by worker state.
"""

from __future__ import annotations

import logging
import multiprocessing
import queue
import sys
import time

import psycopg

from . import jobs, process_control, render, validate_upload
from .config import WorkerConfig
from .render import RenderFailure
from .storage import WorkerStorage

LOG = logging.getLogger("yukcsca.worker")

RETRYABLE_CODES = {"INTERNAL", "SPEECH_SYNTHESIS_FAILED", "RENDER_TIMEOUT"}
TERMINAL_CODES = {"VALIDATION_FAILED", "DURATION_POLICY"}


def _execute_job(job: jobs.ClaimedJob, storage: WorkerStorage, conn) -> str:
    if job.kind == "VALIDATE_UPLOAD":
        return validate_upload.run(job, storage, conn)
    if job.kind == "RENDER_SCENE":
        return render.run(job, storage, conn)
    raise RuntimeError(f"unknown job kind {job.kind}")


def _child_entry(job: jobs.ClaimedJob, config: WorkerConfig, result_queue) -> None:
    """Spawn-safe process entrypoint; local functions cannot be pickled by spawn."""

    # Own a process group so a hard timeout also reaches Manim/TeX/FFmpeg descendants.
    process_control.establish_process_group()
    connection = psycopg.connect(config.db_dsn)
    try:
        storage = WorkerStorage(
            config.s3_endpoint,
            config.s3_bucket,
            config.s3_access_key,
            config.s3_secret_key,
            config.s3_auto_create_bucket,
        )
        result_queue.put(("ok", _execute_job(job, storage, connection), None, None))
    except jobs.StaleClaim as stale:
        result_queue.put(("stale", None, None, str(stale)[:200]))
    except RenderFailure as failure:
        result_queue.put(("render_failure", None, failure.code, failure.detail[:200]))
    except Exception as exception:  # noqa: BLE001 - converted to a bounded parent result
        # Provider/render exceptions may echo narration or TeX. Return only the stable class name.
        result_queue.put(("error", None, None, type(exception).__name__[:200]))
    finally:
        connection.close()


def _run_in_child(job: jobs.ClaimedJob, config: WorkerConfig) -> str:
    """Runs the job in a child process so a hung render cannot stall the worker."""

    context = multiprocessing.get_context("spawn")
    result_queue: multiprocessing.Queue = context.Queue()

    process = context.Process(target=_child_entry, args=(job, config, result_queue))
    process.start()
    timeout = config.render_timeout_seconds + 30
    process.join(timeout)
    if process.is_alive():
        process_control.terminate_process_group(process)
        raise RenderFailure("RENDER_TIMEOUT", "job exceeded the render timeout")
    try:
        status, result, code, detail = result_queue.get(timeout=2)
    except queue.Empty as exception:
        raise RenderFailure(
            "INTERNAL", f"job process exited with code {process.exitcode} without a result"
        ) from exception
    if status == "ok":
        return result
    if status == "stale":
        raise jobs.StaleClaim(detail)
    if status == "render_failure":
        raise RenderFailure(code, detail)
    raise RuntimeError(detail)


def process_job(job: jobs.ClaimedJob, conn, config: WorkerConfig) -> None:
    LOG.info(
        "render.job.claimed jobId=%s kind=%s attempts=%d", job.id, job.kind, job.attempts
    )
    try:
        asset_id = _run_in_child(job, config)
        LOG.info(
            "render.job.completed jobId=%s kind=%s attempts=%d assetId=%s",
            job.id,
            job.kind,
            job.attempts,
            asset_id,
        )
    except jobs.StaleClaim:
        LOG.info("render.job.discarded_stale jobId=%s attempts=%d", job.id, job.attempts)
    except RenderFailure as failure:
        if failure.code in TERMINAL_CODES or job.attempts >= config.max_attempts:
            changed = jobs.fail(conn, job.id, job.attempts, failure.code, failure.detail)
            if not changed:
                LOG.info("render.job.discarded_stale jobId=%s attempts=%d", job.id, job.attempts)
                return
            LOG.warning(
                "render.job.failed jobId=%s kind=%s attempts=%d errorCode=%s",
                job.id,
                job.kind,
                job.attempts,
                failure.code,
            )
        else:
            backoff = min(300, job.attempts * 30)
            changed = jobs.requeue(conn, job.id, job.attempts, backoff)
            if not changed:
                LOG.info("render.job.discarded_stale jobId=%s attempts=%d", job.id, job.attempts)
                return
            LOG.warning(
                "render.job.retry jobId=%s kind=%s attempts=%d errorCode=%s backoffSeconds=%d",
                job.id,
                job.kind,
                job.attempts,
                failure.code,
                backoff,
            )
    except Exception as exception:  # noqa: BLE001 - worker must survive any job
        # Never persist/log arbitrary exception text: Manim/TeX may include authored scene data.
        detail = type(exception).__name__[:200]
        if job.attempts >= config.max_attempts:
            jobs.fail(conn, job.id, job.attempts, "INTERNAL", detail)
            LOG.warning(
                "render.job.failed jobId=%s kind=%s attempts=%d errorCode=INTERNAL",
                job.id,
                job.kind,
                job.attempts,
            )
        else:
            jobs.requeue(conn, job.id, job.attempts, min(300, job.attempts * 30))
            LOG.warning("render.job.retry jobId=%s attempts=%d reason=%s", job.id, job.attempts, detail)


def process_cleanup(conn, config: WorkerConfig) -> None:
    """Deletes at most one due object per poll without starving render jobs."""
    claim = jobs.claim_cleanup(conn)
    if claim is None:
        return
    try:
        storage = WorkerStorage(
            config.s3_endpoint,
            config.s3_bucket,
            config.s3_access_key,
            config.s3_secret_key,
            config.s3_auto_create_bucket,
        )
        storage.delete(claim.storage_key)
        if jobs.complete_cleanup(conn, claim):
            LOG.info("media.object.deleted cleanupId=%s attempts=%d", claim.id, claim.attempts)
    except Exception as exception:  # noqa: BLE001 - external storage boundary must retry later
        # The claim lease already moved delete_after forward; never log object keys or provider text.
        jobs.release_cleanup(conn, claim)
        LOG.warning(
            "media.object.delete_retry cleanupId=%s attempts=%d reason=%s",
            claim.id,
            claim.attempts,
            type(exception).__name__,
        )


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    config = WorkerConfig.from_env()
    if not config.db_dsn:
        LOG.error("WORKER_DB_DSN is required")
        return 2
    while True:
        try:
            with psycopg.connect(config.db_dsn) as conn:
                process_cleanup(conn, config)
                job = jobs.claim_next(
                    conn, config.visibility_timeout_seconds, config.max_attempts
                )
                if job is None:
                    time.sleep(config.poll_interval_seconds)
                    continue
                process_job(job, conn, config)
        except psycopg.Error as error:
            # A clean stack can briefly expose connection/schema errors while Flyway starts.
            LOG.warning("render.worker.db_unavailable reason=%s", type(error).__name__)
            time.sleep(config.poll_interval_seconds)
        except KeyboardInterrupt:
            LOG.info("render.worker.stopped")
            return 0


if __name__ == "__main__":
    sys.exit(main())
