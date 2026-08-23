"""VALIDATE_UPLOAD job handler: probe an uploaded finished video.

Checks the MIME signature (an ``ftyp`` box), MP4 container, duration,
resolution, and size bound; a valid probe re-muxes the bytes with
``-movflags +faststart`` into the asset's final key and moves the asset to
DRAFT. A rejected probe marks the asset REJECTED with bounded reasons — the
job itself still succeeds, because the probe did its work.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
from dataclasses import dataclass

from . import jobs, policy


@dataclass(frozen=True)
class Probe:
    duration_seconds: float
    width: int
    height: int
    container: str


class UploadRejected(Exception):
    def __init__(self, violations: list[tuple[str, str]]) -> None:
        super().__init__("upload rejected")
        self.violations = violations


def _ffprobe(path: str) -> Probe:
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if completed.returncode != 0:
        raise UploadRejected([("container", "UNSUPPORTED")])
    payload = json.loads(completed.stdout)
    video_streams = [
        stream for stream in payload.get("streams", []) if stream.get("codec_type") == "video"
    ]
    if not video_streams:
        raise UploadRejected([("container", "UNSUPPORTED")])
    stream = video_streams[0]
    container = (payload.get("format", {}).get("format_name") or "")
    duration = float(payload.get("format", {}).get("duration") or 0.0)
    return Probe(
        duration_seconds=duration,
        width=int(stream.get("width") or 0),
        height=int(stream.get("height") or 0),
        container=container,
    )


def _has_mp4_signature(path: str) -> bool:
    with open(path, "rb") as handle:
        header = handle.read(12)
    return len(header) >= 8 and header[4:8] == b"ftyp"


def run(job: jobs.ClaimedJob, storage, conn) -> str:
    assert job.video_asset_id is not None
    asset = jobs.load_asset(conn, job.video_asset_id)
    if asset is None:
        raise RuntimeError(f"asset {job.video_asset_id} missing")
    if asset["source"] != "UPLOADED" or asset["status"] != "AWAITING_VALIDATION":
        raise jobs.StaleClaim(
            f"asset {job.video_asset_id} is no longer awaiting upload validation"
        )
    upload_key = asset["storage_key"]
    # Reject oversized objects from S3 metadata before downloading them. A presigned PUT cannot
    # enforce a maximum body size, so the worker is the authoritative asynchronous size gate.
    object_size = storage.content_length(upload_key)
    if object_size <= 0 or object_size > policy.MAX_BYTES:
        jobs.complete_upload_rejection(
            conn,
            job.id,
            job.attempts,
            job.video_asset_id,
            [("byteSize", "OUT_OF_RANGE")],
        )
        return job.video_asset_id
    with tempfile.TemporaryDirectory(prefix="yukcsca-upload-") as work:
        source = os.path.join(work, "source.mp4")
        storage.download(upload_key, source)
        byte_size = os.path.getsize(source)
        try:
            if not _has_mp4_signature(source):
                raise UploadRejected([("mediaType", "UNSUPPORTED")])
            probe = _ffprobe(source)
            if "mp4" not in probe.container:
                raise UploadRejected([("mediaType", "UNSUPPORTED")])
            violations: list[tuple[str, str]] = []
            if byte_size <= 0 or byte_size > policy.MAX_BYTES:
                violations.append(("byteSize", "OUT_OF_RANGE"))
            if not 0 < probe.duration_seconds <= policy.MAX_TOTAL_SECONDS:
                violations.append(("durationSeconds", "OUT_OF_RANGE"))
            if (
                probe.width <= 0
                or probe.height <= 0
                or probe.width > policy.MAX_WIDTH
                or probe.height > policy.MAX_HEIGHT
            ):
                violations.append(("dimensions", "OUT_OF_RANGE"))
            if violations:
                raise UploadRejected(violations)
        except UploadRejected as rejection:
            jobs.complete_upload_rejection(
                conn,
                job.id,
                job.attempts,
                job.video_asset_id,
                rejection.violations,
            )
            return job.video_asset_id

        final_key = f"videos/{job.video_asset_id}/video.mp4"
        remuxed = os.path.join(work, "final.mp4")
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-v",
                    "error",
                    "-i",
                    source,
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    remuxed,
                ],
                capture_output=True,
                timeout=600,
                check=True,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            # A file that probes but cannot be boundedly normalized is deterministically unusable.
            jobs.complete_upload_rejection(
                conn,
                job.id,
                job.attempts,
                job.video_asset_id,
                [("container", "UNSUPPORTED")],
            )
            return job.video_asset_id
        jobs.schedule_cleanup(conn, [final_key], 24 * 60 * 60, "ORPHAN_OUTPUT")
        storage.upload(final_key, remuxed, "video/mp4")
        sha256 = _sha256(remuxed)
        jobs.complete_upload_validation(
            conn,
            job.id,
            job.attempts,
            job.video_asset_id,
            upload_key,
            final_key,
            os.path.getsize(remuxed),
            max(1, round(probe.duration_seconds)),
            probe.width,
            probe.height,
            sha256,
            captions_available=False,
            captions_key=None,
        )
    return job.video_asset_id


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
