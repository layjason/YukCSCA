"""WebVTT cue derivation from segment audio durations (stdlib only).

Captions are segment-timed by design (ADR-0003): cue timing comes from the
probed duration of each segment's gTTS narration and the narration text is the
authoritative transcript. No speech recognition is involved. Each cue carries
at most two display lines: narration is split into clauses at sentence/clause
boundaries (never inside an inline ``\\(...\\)`` LaTeX span) and clauses are
packed greedily, with cue times distributed proportionally by clause length so
the total timing stays exact.
"""

from __future__ import annotations

import math
from typing import Sequence

from .markup import CLOSE as MATH_CLOSE
from .markup import OPEN as MATH_OPEN

# Line budgets as weighted units: one Latin char weighs 10 (~42 chars/line),
# one CJK char weighs 21 (~20 chars/line). A cue may span two lines.
LINE_UNITS = 420
MAX_CUE_LINES = 2
MIN_CUE_SECONDS = 1.0
PRIMARY_BREAKS = ".!?;:。！？；"
SECONDARY_BREAKS = ",，、"
PLACEHOLDER_TEXT = "(narration)"


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
    cue_number = 0
    for index, (narration, duration) in enumerate(zip(narrations, durations)):
        end = start + max(0.0, duration)
        for cue_start, cue_end, cue_text in _segment_cues(start, end, narration):
            cue_number += 1
            lines.append(str(cue_number))
            lines.append(f"{_format_timestamp(cue_start)} --> {_format_timestamp(cue_end)}")
            lines.append(cue_text)
            lines.append("")
        start = end
    return "\n".join(lines).rstrip() + "\n"


def _segment_cues(
    start: float, end: float, narration: str
) -> list[tuple[float, float, str]]:
    """Cues for one segment: contiguous times ending exactly at the segment end."""

    cues = _pack_cues(_clauses(narration)) or [PLACEHOLDER_TEXT]
    if len(cues) == 1:
        return [(start, end, cues[0])]
    total_weight = sum(len(cue) for cue in cues)
    spans: list[list] = []
    cursor = start
    for cue in cues:
        share = (end - start) * (len(cue) / total_weight)
        spans.append([cursor, min(cursor + share, end), cue])
        cursor += share
    spans[-1][1] = end  # proportional drift never moves the segment boundary
    spans = _merge_short_spans(spans)
    return [(span[0], span[1], span[2]) for span in spans]


def _merge_short_spans(spans: list[list]) -> list[list]:
    """Merges the shortest adjacent pair until every cue lasts ~MIN_CUE_SECONDS.

    Prefers a partner whose combined text still fits the two-line budget. When
    no merge fits, the two-line budget wins and the short cue is left as-is
    so a frame never packs more than two display lines.
    """

    while len(spans) > 1:
        durations = [span[1] - span[0] for span in spans]
        shortest = min(range(len(spans)), key=lambda index: durations[index])
        if durations[shortest] >= MIN_CUE_SECONDS:
            break
        candidates = []
        if shortest > 0:
            candidates.append(shortest - 1)
        if shortest < len(spans) - 1:
            candidates.append(shortest + 1)
        fitting = [
            partner
            for partner in candidates
            if _line_estimate(_join(spans[shortest][2], spans[partner][2]))
            <= MAX_CUE_LINES
        ]
        if not fitting:
            # Two-line budget wins over the 1s floor: a physically short
            # segment keeps multiple cues rather than packing them into one
            # overfull frame.
            break
        partner = min(fitting, key=lambda index: durations[index])
        low, high = min(shortest, partner), max(shortest, partner)
        merged = [spans[low][0], spans[high][1], _join(spans[low][2], spans[high][2])]
        spans[low : high + 1] = [merged]
    return spans


def _clauses(narration: str) -> list[str]:
    """Atomic caption pieces split at clause boundaries outside LaTeX spans.

    Primary boundaries are sentence punctuation (Latin ``.!?;:`` and CJK
    ``。！？；``); a piece that would exceed two display lines is re-split at
    secondary boundaries (``,，、``). Punctuation stays attached to its clause,
    so a single overlong unbroken clause wraps naturally in the player.
    """

    text = " ".join((narration or "").split())
    if not text:
        return []
    pieces: list[str] = []
    for clause in _split_after_breaks(text, PRIMARY_BREAKS):
        if _line_estimate(clause) <= MAX_CUE_LINES:
            pieces.append(clause.strip())
            continue
        pieces.extend(
            piece.strip() for piece in _split_after_breaks(clause, SECONDARY_BREAKS)
        )
    return [piece for piece in pieces if piece]


def _split_after_breaks(text: str, breaks: str) -> list[str]:
    """Splits after each break character; returns ``text`` whole when none match."""

    parts: list[str] = []
    remaining = text
    while remaining:
        cut = _next_cut(remaining, breaks)
        if cut is None:
            parts.append(remaining)
            break
        parts.append(remaining[:cut])
        remaining = remaining[cut:]
    return parts


def _next_cut(text: str, breaks: str) -> int | None:
    """Index just past the first break char outside ``\\(...)\\`` spans.

    An unterminated LaTeX span protects the rest of the text from splitting.
    """

    index = 0
    while index < len(text):
        if text.startswith(MATH_OPEN, index):
            close = text.find(MATH_CLOSE, index + len(MATH_OPEN))
            if close < 0:
                return None
            index = close + len(MATH_CLOSE)
            continue
        if text[index] in breaks:
            return index + 1
        index += 1
    return None


def _pack_cues(pieces: list[str]) -> list[str]:
    """Greedy two-line packing of clause pieces in original order."""

    cues: list[str] = []
    current = ""
    for piece in pieces:
        candidate = _join(current, piece)
        if current and _line_estimate(candidate) > MAX_CUE_LINES:
            cues.append(current)
            current = piece
        else:
            current = candidate
    if current:
        cues.append(current)
    return cues


def _join(left: str, right: str) -> str:
    """Space join for Latin adjacency; CJK/full-width pairs stay unspaced."""

    if not left:
        return right
    if ord(left[-1]) > 127 or ord(right[0]) > 127:
        return left + right
    return f"{left} {right}"


def _char_units(character: str) -> int:
    """Wide (CJK/full-width) glyphs weigh ~2x a Latin char for line budgets."""

    return 21 if ord(character) > 127 else 10


def _units(text: str) -> int:
    return sum(_char_units(character) for character in text)


def _line_estimate(text: str) -> int:
    """Display lines the player needs under the per-language line budget."""

    return max(1, math.ceil(_units(text) / LINE_UNITS))
