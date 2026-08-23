"""WebVTT cue derivation from segment audio durations (stdlib only).

Captions are segment-level by design (ADR-0003): cue timing comes from the
probed duration of each segment's gTTS narration and the narration text is the
authoritative transcript. No speech recognition is involved.
"""

from __future__ import annotations

from typing import Sequence


def _format_timestamp(total_seconds: float) -> str:
    total_millis = max(0, round(total_seconds * 1000))
    hours, remainder = divmod(total_millis, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{millis:03d}"


def build_captions(narrations: Sequence[str], durations: Sequence[float]) -> str:
    if len(narrations) != len(durations):
        raise ValueError("narrations and durations must have equal length")
    lines = ["WEBVTT", ""]
    start = 0.0
    for index, (narration, duration) in enumerate(zip(narrations, durations)):
        end = start + max(0.0, duration)
        lines.append(str(index + 1))
        lines.append(f"{_format_timestamp(start)} --> {_format_timestamp(end)}")
        lines.extend(_cue_lines(narration))
        lines.append("")
        start = end
    return "\n".join(lines).rstrip() + "\n"


def _cue_lines(narration: str) -> list[str]:
    text = " ".join(narration.split())
    if not text:
        return ["(narration)"]
    # Keep cues readable without exceeding common player line lengths.
    if len(text) <= 80:
        return [text]
    words = text.split(" ")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > 80 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines
