"""Worker configuration from environment variables (stdlib only)."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default


@dataclass(frozen=True)
class WorkerConfig:
    db_dsn: str
    s3_endpoint: str
    s3_bucket: str
    s3_access_key: str
    s3_secret_key: str
    s3_auto_create_bucket: bool
    max_attempts: int
    visibility_timeout_seconds: int
    render_timeout_seconds: int
    poll_interval_seconds: int

    @classmethod
    def from_env(cls) -> "WorkerConfig":
        render_timeout = max(60, _int("WORKER_RENDER_TIMEOUT_SECONDS", 900))
        # The visibility lease must outlive the child hard-timeout (render timeout + shutdown
        # grace), otherwise a second worker can reclaim a job while the first still renders it.
        visibility_timeout = max(
            render_timeout + 60,
            _int("WORKER_VISIBILITY_TIMEOUT_SECONDS", render_timeout + 60),
        )
        return cls(
            db_dsn=os.environ.get("WORKER_DB_DSN", ""),
            s3_endpoint=os.environ.get("WORKER_S3_ENDPOINT", ""),
            s3_bucket=os.environ.get("WORKER_S3_BUCKET", "yukcsca-media"),
            s3_access_key=os.environ.get("WORKER_S3_ACCESS_KEY", ""),
            s3_secret_key=os.environ.get("WORKER_S3_SECRET_KEY", ""),
            s3_auto_create_bucket=os.environ.get("WORKER_S3_AUTO_CREATE_BUCKET", "").lower()
            in ("1", "true", "yes"),
            max_attempts=min(5, max(1, _int("WORKER_MAX_ATTEMPTS", 3))),
            visibility_timeout_seconds=visibility_timeout,
            render_timeout_seconds=render_timeout,
            poll_interval_seconds=max(1, _int("WORKER_POLL_INTERVAL_SECONDS", 5)),
        )
