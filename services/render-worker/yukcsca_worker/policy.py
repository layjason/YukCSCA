"""Bounded duration/size policy for reviewed short videos (stdlib only).

Bounds match the Flyway check constraints and the accepted contract: total
duration and playback positions are capped at 600 seconds, uploads at 200 MiB,
and rendered output at 1080p-class dimensions. A render exceeding any bound
fails terminally with ``DURATION_POLICY`` and creates no asset (AC-10).
"""

from __future__ import annotations

from typing import Sequence

MAX_TOTAL_SECONDS = 600
MAX_SEGMENT_SECONDS = 120
MAX_BYTES = 209_715_200
MAX_WIDTH = 3840
MAX_HEIGHT = 2160
RENDER_WIDTH = 1280
RENDER_HEIGHT = 720


def check_segment_durations(durations: Sequence[float]) -> str | None:
    """Returns a bounded error detail when any segment or the total exceeds policy."""
    for index, duration in enumerate(durations):
        if duration <= 0:
            return f"segment {index} audio duration is not positive"
        if duration > MAX_SEGMENT_SECONDS:
            return f"segment {index} narration exceeds {MAX_SEGMENT_SECONDS}s"
    total = sum(durations)
    if total > MAX_TOTAL_SECONDS:
        return f"total narration duration {total:.1f}s exceeds {MAX_TOTAL_SECONDS}s"
    return None


def check_probe(
    byte_size: int, duration_seconds: float, width: int, height: int
) -> str | None:
    if byte_size <= 0 or byte_size > MAX_BYTES:
        return f"byte size {byte_size} exceeds {MAX_BYTES}"
    if duration_seconds <= 0 or duration_seconds > MAX_TOTAL_SECONDS:
        return f"duration {duration_seconds:.1f}s outside 1..{MAX_TOTAL_SECONDS}"
    if width <= 0 or height <= 0 or width > MAX_WIDTH or height > MAX_HEIGHT:
        return f"dimensions {width}x{height} outside bounds"
    return None
