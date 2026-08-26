"""RENDER_SCENE job handler: render a validated scene specification.

The worker consumes only schema-validated scene snapshots (data, never
executable scene code — V1.7) and re-validates against its own registry copy
first: an invalid or registry-obsolete script fails as VALIDATION_FAILED with
no asset. Per-segment gTTS narration durations drive both the visual segment
lengths and the derived WebVTT cues (ADR-0003); durations come from probing
the synthesized audio, never from speech recognition.

Manim and manim-voiceover are imported lazily so validation, policy, and
caption logic stay testable without the render stack installed.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import subprocess
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from . import jobs, markup, policy, registry, vtt


class RenderFailure(Exception):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


def run(job: jobs.ClaimedJob, storage, conn) -> str:
    assert job.scene_specification_id is not None
    if job.registry_version != registry.VERSION:
        raise RenderFailure(
            "VALIDATION_FAILED",
            f"scene registry {job.registry_version!r} is not worker registry {registry.VERSION!r}",
        )
    snapshot = job.snapshot_dict()
    violations = registry.validate_specification(snapshot)
    if violations:
        detail = "; ".join(f"{path}:{code}" for path, code in violations[:5])
        raise RenderFailure("VALIDATION_FAILED", detail)
    language = snapshot["explanationLanguage"]
    segments = snapshot["segments"]
    narrations = [segment["narrationText"] for segment in segments]

    with tempfile.TemporaryDirectory(prefix="yukcsca-render-") as media_dir:
        cache_dir = os.path.join(media_dir, "voiceovers")
        os.makedirs(cache_dir, exist_ok=True)
        durations, service = _synthesize(narrations, language, cache_dir)
        policy_detail = policy.check_segment_durations(durations)
        if policy_detail is not None:
            raise RenderFailure("DURATION_POLICY", policy_detail)

        video_path = _render(segments, service, durations, media_dir, job.id, language)
        final_path = _faststart(video_path, media_dir)
        probe = _probe(final_path)
        byte_size = os.path.getsize(final_path)
        probe_detail = policy.check_probe(
            byte_size, probe["duration"], probe["width"], probe["height"]
        )
        if probe_detail is not None:
            raise RenderFailure("DURATION_POLICY", probe_detail)

        asset_id = str(uuid.uuid4())
        video_key = f"videos/{asset_id}/video.mp4"
        captions_key = f"videos/{asset_id}/captions.vtt"
        captions = vtt.build_captions(narrations, durations).encode("utf-8")
        jobs.schedule_cleanup(
            conn, [video_key, captions_key], 24 * 60 * 60, "ORPHAN_OUTPUT"
        )
        storage.upload(video_key, final_path, "video/mp4")
        storage.client.put_object(
            Bucket=storage.bucket,
            Key=captions_key,
            Body=captions,
            ContentType="text/vtt",
        )
        jobs.complete_render(
            conn,
            job.id,
            job.attempts,
            asset_id,
            job.scene_specification_id,
            language,
            video_key,
            byte_size,
            max(1, round(probe["duration"])),
            probe["width"],
            probe["height"],
            _sha256(final_path),
            captions_key,
        )
    return asset_id


def _synthesize(narrations: list[str], language: str, cache_dir: str):
    """Synthesizes every segment once and probes its audio duration.

    ``_wrap_generate_from_text`` is the pinned manim-voiceover 0.4.0 seam that
    synthesizes (or cache-hits) one narration; the same cache is reused by the
    scene render so narration is never synthesized twice.
    """

    from manim_voiceover.modify_audio import get_duration
    from manim_voiceover.services.gtts import GTTSService

    gtts_lang = {"id": "id", "en": "en", "zh-CN": "zh-CN"}.get(language, "en")
    service = GTTSService(lang=gtts_lang, cache_dir=cache_dir)
    durations: list[float] = []
    try:
        for narration in narrations:
            data = service._wrap_generate_from_text(narration)  # noqa: SLF001
            duration = get_duration(Path(cache_dir) / data["final_audio"])
            if duration is None or duration <= 0:
                raise RenderFailure("SPEECH_SYNTHESIS_FAILED", "segment audio duration unknown")
            durations.append(float(duration))
    except RenderFailure:
        raise
    except Exception as exception:  # gTTS/network failures stay bounded
        raise RenderFailure("SPEECH_SYNTHESIS_FAILED", type(exception).__name__) from exception
    return durations, service


def _render(
    segments: list[dict[str, Any]],
    service,
    durations: list[float],
    media_dir: str,
    job_id: str,
    language: str,
) -> str:
    """Renders the scene with Manim CE + manim-voiceover; returns the MP4 path."""

    import manim as mn
    from manim_voiceover import VoiceoverScene

    class ScriptScene(VoiceoverScene):
        def construct(self) -> None:
            self.set_speech_service(service)
            previous = None
            for index, segment in enumerate(segments):
                board = build_segment_board(segment, language)
                with self.voiceover(text=segment["narrationText"]):
                    # Duration matches the WebVTT cue. Fade the previous card so glyphs never
                    # stack, then stroke-write the new board (Manim Write, 3Blue1Brown-style).
                    run_time = durations[index]
                    fade, create, write = animation_timings(
                        run_time,
                        has_previous=previous is not None,
                        has_frames=bool(board.frames),
                    )
                    if previous is not None:
                        self.play(mn.FadeOut(previous, shift=mn.UP * 0.12), run_time=fade)
                    if board.frames:
                        self.play(
                            mn.LaggedStart(
                                *[mn.Create(frame) for frame in board.frames],
                                lag_ratio=0.18,
                            ),
                            run_time=create,
                        )
                    self.play(
                        mn.LaggedStart(
                            *[mn.Write(mobject) for mobject in board.writings],
                            lag_ratio=0.16,
                        ),
                        run_time=write,
                    )
                previous = board.group

    mn.config.media_dir = media_dir
    mn.config.quality = "medium_quality"
    mn.config.frame_rate = 30
    mn.config.output_file = f"render-{job_id}.mp4"
    scene = ScriptScene()
    scene.render()
    return movie_path_from_scene(scene)


def movie_path_from_scene(scene) -> str:
    """Returns the MP4 Manim actually wrote.

    Dynamic in-process scenes have no ``module_name``, so
    ``config.get_dir("video_dir")`` raises KeyError even after a successful
    render. The file writer keeps the concrete path.
    """

    writer = getattr(getattr(scene, "renderer", None), "file_writer", None)
    path = getattr(writer, "movie_file_path", None) if writer is not None else None
    if path is None:
        raise RenderFailure("INTERNAL", "rendered output missing")
    resolved = Path(path)
    if not resolved.is_file():
        raise RenderFailure("INTERNAL", "rendered output missing")
    return str(resolved)


@dataclass
class SegmentBoard:
    """Laid-out card split into stroke-drawn frames and written glyphs."""

    group: Any
    frames: list
    writings: list


def animation_timings(
    run_time: float, *, has_previous: bool, has_frames: bool
) -> tuple[float, float, float]:
    """Splits one segment into fade / Create / Write seconds that sum to ``run_time``.

    Write takes most of the window so equations draw with the narration instead of
    popping in. Frames (card borders, underline) draw first and stay short.
    """

    duration = max(0.55, float(run_time))
    fade = min(0.35, duration * 0.12) if has_previous else 0.0
    remaining = duration - fade
    create = min(0.45, remaining * 0.16) if has_frames else 0.0
    write = remaining - create
    return fade, create, write


# ---------------------------------------------------------------------------
# CSCA Math pure numeric helpers (D-06..D-09).
#
# Module-level and manim-free on purpose: the sampler, key-point finder, number
# formatters, and equation builder are unit-testable without the render stack.
# They are render-time robustness only — semantic validation lives in the
# registries (Java + mirror), never here. No SymPy, no exec/eval; everything is
# plain ``math``-module numerics over floats.
# ---------------------------------------------------------------------------

FAMILY_COEFFICIENT_KEYS: dict[str, tuple[str, ...]] = {
    "LINEAR": ("a", "b"),
    "QUADRATIC": ("a", "b", "c"),
    "POWER": ("a", "n"),
    "EXP": ("a", "r"),
    "LOG": ("a", "base"),
    "SIN": ("a", "b", "c", "d"),
    "COS": ("a", "b", "c", "d"),
}

SAMPLES_PER_CURVE = 481
KEY_POINT_GRID = 241
MAX_KEY_POINTS_PER_KIND = 8


def curve_coefficients(family: str, params: dict[str, Any]) -> dict[str, float]:
    """Extracts the family's known coefficient keys as floats.

    Validation guarantees every family-required coefficient is a present number.
    """

    return {key: float(params[key]) for key in FAMILY_COEFFICIENT_KEYS.get(family, ())}


def evaluate_curve(family: str, coeffs: dict[str, float], x: float) -> float | None:
    """Samples one curve family at ``x``; returns None where the value is undefined.

    LOG samples x > 0 only; POWER skips non-positive bases with fractional
    exponents. Requires the family's validated coefficients.
    """

    def coef(key: str) -> float:
        return float(coeffs[key])

    a = coef("a")
    try:
        if family == "LINEAR":
            return a * x + coef("b")
        if family == "QUADRATIC":
            return a * x * x + coef("b") * x + coef("c")
        if family == "POWER":
            exponent = coef("n")
            if x < 0 and exponent != int(exponent):
                return None
            return a * math.pow(x, exponent)
        if family == "EXP":
            ratio = coef("r")
            return a * math.pow(ratio, x)
        if family == "LOG":
            base = coef("base")
            if x <= 0 or base <= 0 or base == 1:
                return None
            return a * (math.log(x) / math.log(base))
        if family in ("SIN", "COS"):
            b = coef("b")
            c = coef("c")
            d = coef("d")
            wave = math.sin(b * x + c) if family == "SIN" else math.cos(b * x + c)
            return a * wave + d
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
    return None


def sample_curve_runs(
    family: str,
    coeffs: dict[str, float],
    x_min: float,
    x_max: float,
) -> list[list[tuple[float, float]]]:
    """Contiguous (x, y) runs over the defined domain; splits at undefined points.

    Requires ``x_min < x_max`` — the board builder normalizes before sampling.
    """

    lo = float(x_min)
    hi = float(x_max)
    step = (hi - lo) / (SAMPLES_PER_CURVE - 1)
    runs: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    for index in range(SAMPLES_PER_CURVE):
        x = lo + index * step
        y = evaluate_curve(family, coeffs, x)
        if y is None or not math.isfinite(y):
            if len(current) >= 2:
                runs.append(current)
            current = []
            continue
        current.append((x, y))
    if len(current) >= 2:
        runs.append(current)
    return runs


def find_key_points(
    family: str,
    coeffs: dict[str, float],
    x_min: float,
    x_max: float,
) -> tuple[list[float], list[float]]:
    """Finds (roots, extrema) on a sampled grid via sign-change bisection.

    Roots bisect raw sign changes of the curve; extrema bisect sign changes of a
    central-difference slope. Results are ordered by x and capped so the paused
    frame stays readable. Purely numeric — no symbolic math dependency.
    Requires ``x_min < x_max`` — the board builder normalizes before searching.
    """

    lo = float(x_min)
    hi = float(x_max)
    step = (hi - lo) / (KEY_POINT_GRID - 1)
    xs = [lo + index * step for index in range(KEY_POINT_GRID)]
    ys = [evaluate_curve(family, coeffs, x) for x in xs]

    def f(x: float) -> float | None:
        return evaluate_curve(family, coeffs, x)

    roots: list[float] = []
    for index in range(KEY_POINT_GRID):
        # A root that lands exactly on a grid sample must be kept, not bisected away.
        if ys[index] == 0.0:
            if _novel(roots, xs[index]):
                roots.append(xs[index])
                if len(roots) >= MAX_KEY_POINTS_PER_KIND:
                    break
    for index in range(KEY_POINT_GRID - 1):
        left_y, right_y = ys[index], ys[index + 1]
        if (
            left_y is None
            or right_y is None
            or left_y == 0.0
            or right_y == 0.0
            or (left_y < 0) == (right_y < 0)
        ):
            continue
        root = _bisect(f, xs[index], xs[index + 1])
        if root is not None and _novel(roots, root) and len(roots) < MAX_KEY_POINTS_PER_KIND:
            roots.append(root)

    def slope(x: float) -> float | None:
        h = max((hi - lo) / 10000.0, 1e-9)
        left = f(x - h)
        right = f(x + h)
        if left is None or right is None:
            return None
        return (right - left) / (2 * h)

    extrema: list[float] = []
    for index in range(1, KEY_POINT_GRID - 1):
        left_y, mid_y, right_y = ys[index - 1], ys[index], ys[index + 1]
        if left_y is None or mid_y is None or right_y is None:
            continue
        left_slope = slope(xs[index - 1])
        right_slope = slope(xs[index + 1])
        if left_slope is None or right_slope is None:
            continue
        if left_slope == 0.0 or right_slope == 0.0:
            continue
        if (left_slope < 0) != (right_slope < 0):
            point = _bisect(slope, xs[index - 1], xs[index + 1])
            if point is not None and _novel(extrema, point):
                extrema.append(point)
                if len(extrema) >= MAX_KEY_POINTS_PER_KIND:
                    break

    return sorted(roots), sorted(extrema)


def _bisect(function, left: float, right: float) -> float | None:
    """Bisection refinement between two points whose signs differ; None when degenerate."""

    left_value = function(left)
    right_value = function(right)
    if left_value is None or right_value is None or left_value == 0.0 or right_value == 0.0:
        return None
    if (left_value < 0) == (right_value < 0):
        return None
    for _ in range(60):
        middle = (left + right) / 2
        middle_value = function(middle)
        if middle_value is None:
            return None
        if (middle_value < 0) == (left_value < 0):
            left, left_value = middle, middle_value
        else:
            right, right_value = middle, middle_value
    return (left + right) / 2


def _novel(existing: list[float], candidate: float) -> bool:
    return all(abs(candidate - point) > 1e-6 for point in existing)


def interval_layout(
    left: float | None,
    right: float | None,
    left_infinite: bool,
    right_infinite: bool,
) -> tuple[float, float, bool, bool]:
    """Number-line domain and which ends get a numbered mark.

    Infinite ends are arrows, not dummy numbered dots (D-08). The domain is
    taken from finite ends when any exist; both-infinite uses a unit scale.
    """

    mark_left = not left_infinite
    mark_right = not right_infinite
    finite: list[float] = []
    if mark_left and left is not None:
        finite.append(float(left))
    if mark_right and right is not None:
        finite.append(float(right))
    if len(finite) >= 2:
        lo, hi = min(finite), max(finite)
    elif len(finite) == 1:
        lo = hi = finite[0]
    else:
        lo, hi = -1.0, 1.0
    margin = max((hi - lo) * 0.35, 1.0)
    domain_lo = lo - margin
    domain_hi = hi + margin
    if left_infinite:
        domain_lo -= margin
    if right_infinite:
        domain_hi += margin
    if domain_hi <= domain_lo:
        domain_hi = domain_lo + 1.0
    return domain_lo, domain_hi, mark_left, mark_right


def format_number(value: float) -> str:
    """Plain dot-decimal text regardless of explanation language; never comma decimals."""

    number = float(value)
    rounded = round(number, 6)
    if rounded == int(rounded):
        return str(int(rounded))
    text = f"{rounded:.6f}".rstrip("0").rstrip(".")
    return "-0" if text in ("", "-") else text


def interval_notation_parts(scopes: list[dict[str, Any]]) -> list[str]:
    """One interval-notation fragment per validated union scope (pure; no manim)."""

    parts: list[str] = []
    for scope in scopes:
        left_infinite = scope.get("leftInf") == "INFINITE"
        right_infinite = scope.get("rightInf") == "INFINITE"
        left_tex = r"-\infty" if left_infinite else format_number(float(scope["left"]))
        right_tex = r"\infty" if right_infinite else format_number(float(scope["right"]))
        left_bracket = (
            "(" if left_infinite or scope.get("leftBound") != "CLOSED" else "["
        )
        right_bracket = (
            ")" if right_infinite or scope.get("rightBound") != "CLOSED" else "]"
        )
        parts.append(f"{left_bracket}{left_tex},{right_tex}{right_bracket}")
    return parts


def interval_notation_latex(scopes: list[dict[str, Any]]) -> str:
    """Interval-notation LaTeX for validated union scopes (pure; no manim).

    Per scope ``(a,b)`` / ``[a,b]`` brackets follow the open/closed bounds;
    infinite ends contribute ``-\\infty`` / ``\\infty`` with open ends and no
    bound mark. Scopes join with ``\\cup``, e.g. ``(-\\infty,2] \\cup
    (5,\\infty)``. Endpoints are dot-decimal via :func:`format_number`.
    """

    return " \\cup ".join(interval_notation_parts(scopes))


def union_scope_color(index: int) -> str:
    """Pastel stroke for union scope ``index`` (0-based, wraps after four).

    Distinct colors let a paused last frame show which span is which and
    which fragment of the ``\\cup`` notation it belongs to — without a
    separate focus-index parameter (registry stays ``2026-08.4``).
    """

    palette = (_ACCENT_GREEN, _ACCENT_AMBER, _ACCENT_BLUE, _ACCENT_LILAC)
    return palette[index % len(palette)]


def _optional_endpoint(params: dict[str, Any], key: str) -> float | None:
    """Finite endpoint when present and numeric; None on an infinite/omitted end."""

    value = params.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _join_terms(terms: list[tuple[float, str | None]]) -> str:
    """Joins signed coefficient terms, dropping zeros and leading ``+``/``1`` noise."""

    pieces: list[str] = []
    for value, body in terms:
        if value == 0:
            continue
        magnitude_text = format_number(abs(value))
        if body is None:
            piece = magnitude_text
        elif magnitude_text == "1":
            piece = body
        else:
            piece = magnitude_text + body
        if not pieces:
            pieces.append(("-" if value < 0 else "") + piece)
        else:
            pieces.append((" - " if value < 0 else " + ") + piece)
    return "".join(pieces) if pieces else "0"


def equation_latex(family: str, coeffs: dict[str, float]) -> str:
    """Builds the reviewed per-family equation label, e.g. ``y = ax^{2}+bx+c``."""

    if family not in FAMILY_COEFFICIENT_KEYS:
        raise ValueError(f"unknown curve family {family!r}")

    def coef(key: str) -> float:
        return float(coeffs[key])

    a = coef("a")
    if family == "LINEAR":
        return "y = " + _join_terms([(a, "x"), (coef("b"), None)])
    if family == "QUADRATIC":
        return "y = " + _join_terms([(a, "x^{2}"), (coef("b"), "x"), (coef("c"), None)])
    if family == "POWER":
        exponent = format_number(coef("n"))
        body = "x^{" + exponent + "}"
        if a == 0:
            return "y = 0"
        lead = "" if abs(a) == 1 else format_number(abs(a))
        prefix = "-" if a < 0 else ""
        return f"y = {prefix}{lead}{body}"
    if family == "EXP":
        if a == 0:
            return "y = 0"
        lead = "-" if a < 0 else ""
        multiplier = "" if abs(a) == 1 else format_number(abs(a)) + " \\cdot "
        return f"y = {lead}{multiplier}{format_number(coef('r'))}^{{x}}"
    if family == "LOG":
        if a == 0:
            return "y = 0"
        base = format_number(coef("base"))
        lead = "-" if a < 0 else ""
        multiplier = "" if abs(a) == 1 else format_number(abs(a))
        return rf"y = {lead}{multiplier}\log_{{{base}}}(x)"
    if family in ("SIN", "COS"):
        inner = _join_terms([(coef("b"), "x"), (coef("c"), None)])
        function = "\\sin" if family == "SIN" else "\\cos"
        if a == 0:
            return "y = " + format_number(coef("d"))
        wave = function + "(" + inner + ")"
        if abs(a) == 1:
            core = ("-" if a < 0 else "") + wave
        else:
            core = format_number(a) + wave
        d = coef("d")
        suffix = ""
        if d != 0:
            suffix = (" - " + format_number(abs(d))) if d < 0 else (" + " + format_number(d))
        return "y = " + core + suffix
    raise ValueError(f"unknown curve family {family!r}")


def build_segment_visual(segment: dict[str, Any], language: str):
    """Builds one reviewed visual card (group only; used by tests)."""

    return build_segment_board(segment, language).group


def build_segment_board(segment: dict[str, Any], language: str) -> SegmentBoard:
    """Builds one reviewed visual card.

    Layout is one card at a time (title or body in the centre). The scene loop
    fades the previous group, Creates frames, then Writes glyphs. Authored input
    never reaches code execution — only schema-validated params.
    """

    import manim as mn

    action_id = segment["templateActionId"]
    params = segment.get("params") or {}
    frame_w = mn.config.frame_width
    if action_id == "title-heading":
        heading = compose_markup(
            params["text"],
            language=language,
            font_size=46,
            weight=mn.BOLD,
            max_width=frame_w - 1.8,
        )
        rule = mn.Underline(heading, color=mn.ManimColor("#8FB8D8"), buff=0.22)
        group = mn.VGroup(heading, rule).arrange(mn.DOWN, buff=0.18).move_to(mn.ORIGIN)
        return SegmentBoard(group=group, frames=[], writings=[heading, rule])
    if action_id == "concept-definition":
        term = compose_markup(
            params["term"],
            language=language,
            font_size=38,
            weight=mn.BOLD,
            max_width=frame_w - 2.4,
        )
        bar = mn.Rectangle(
            width=0.12,
            height=max(0.7, term.height + 0.18),
            stroke_width=0,
            fill_color=mn.ManimColor("#7BC4B0"),
            fill_opacity=1,
        )
        term_row = mn.VGroup(bar, term).arrange(mn.RIGHT, buff=0.28, aligned_edge=mn.DOWN)
        definition = compose_markup(
            params["definition"],
            language=language,
            font_size=28,
            max_width=frame_w - 3.2,
            wrap_width=38,
        )
        box, body = framed_card(definition, stroke=mn.ManimColor("#7BC4B0"), pad=0.42)
        card = mn.VGroup(box, body)
        group = (
            mn.VGroup(term_row, card)
            .arrange(mn.DOWN, buff=0.5, aligned_edge=mn.LEFT)
            .move_to(mn.ORIGIN)
        )
        return SegmentBoard(group=group, frames=[bar, box], writings=[term, body])
    if action_id == "statement-text":
        body = compose_markup(
            params["text"],
            language=language,
            font_size=30,
            max_width=frame_w - 3.0,
            wrap_width=40,
        )
        box, content = framed_card(body, stroke=mn.ManimColor("#8FB8D8"), pad=0.5)
        group = mn.VGroup(box, content).move_to(mn.ORIGIN)
        return SegmentBoard(group=group, frames=[box], writings=[content])
    if action_id == "worked-example-step":
        label = compose_markup(
            params["stepLabel"],
            language=language,
            font_size=24,
            weight=mn.BOLD,
            max_width=frame_w - 3.5,
        )
        pill_box, pill_body = framed_card(label, stroke=mn.ManimColor("#E6C07B"), pad=0.28)
        pill = mn.VGroup(pill_box, pill_body)
        expression = mn.MathTex(markup.tex_for_manim(params["expression"]), font_size=46)
        if expression.width > frame_w - 2.6:
            expression.scale_to_fit_width(frame_w - 2.6)
        formula_box, formula_body = framed_card(
            expression, stroke=mn.ManimColor("#8FB8D8"), pad=0.48
        )
        formula = mn.VGroup(formula_box, formula_body)
        group = mn.VGroup(pill, formula).arrange(mn.DOWN, buff=0.45).move_to(mn.ORIGIN)
        return SegmentBoard(
            group=group,
            frames=[pill_box, formula_box],
            writings=[pill_body, formula_body],
        )
    if action_id == "highlight-box":
        body = compose_markup(
            params["text"],
            language=language,
            font_size=30,
            max_width=frame_w - 3.2,
            wrap_width=38,
        )
        box, content = framed_card(body, stroke=mn.ManimColor("#E6C07B"), pad=0.5)
        group = mn.VGroup(box, content).move_to(mn.ORIGIN)
        return SegmentBoard(group=group, frames=[box], writings=[content])
    if action_id == "function-graph":
        return _function_graph_board(params, frame_w)
    if action_id == "number-line-interval":
        return _number_line_interval_board(params, frame_w)
    if action_id == "number-line-union":
        return _number_line_union_board(params, frame_w)
    raise RenderFailure("VALIDATION_FAILED", f"unknown action {action_id}")


_ACCENT_BLUE = "#8FB8D8"
_ACCENT_GREEN = "#7BC4B0"
_ACCENT_AMBER = "#E6C07B"
_ACCENT_LILAC = "#C9A0D0"


def _view_y_range(params: dict[str, Any], sampled: list[float]) -> list[float]:
    """Y view for the axes: authored yMin<yMax wins; otherwise an auto range.

    Render-time robustness only — the registries intentionally accept a bad
    yMin/yMax pair, so an inverted pair silently falls back to the auto view
    instead of failing the render.
    """

    y_min = params.get("yMin")
    y_max = params.get("yMax")
    if (
        isinstance(y_min, (int, float))
        and not isinstance(y_min, bool)
        and isinstance(y_max, (int, float))
        and not isinstance(y_max, bool)
        and float(y_min) < float(y_max)
    ):
        return [float(y_min), float(y_max)]
    values = [value for value in sampled if math.isfinite(value)] or [0.0]
    low, high = min(values), max(values)
    if high - low < 1e-9:
        low, high = low - 1.0, high + 1.0
    pad = (high - low) * 0.14
    return [low - pad, high + pad]


def _axis_step(span: float) -> float:
    """A readable tick step: one of {0.2, 0.5, 1, 2, 5, 10, 20, 25, 50} scaled by decades."""

    raw = span / 5
    magnitude = 10 ** math.floor(math.log10(raw)) if raw > 0 else 1.0
    normalized = raw / magnitude
    for candidate in (1.0, 2.0, 2.5, 5.0, 10.0):
        if normalized <= candidate:
            return candidate * magnitude
    return 10.0 * magnitude


def select_key_points(
    mode: str, found: tuple[list[float], list[float]]
) -> tuple[list[float], list[float]]:
    """Applies the reviewed ``keyPoints`` mode to ``(roots, extrema)`` findings.

    ROOTS shows roots only (product-owner defect fix: extrema previously leaked
    into the ROOTS view), EXTREMA shows extrema only, BOTH keeps both, NONE and
    any unknown mode keep neither so a bad value degrades to curve-only. Pure
    and manim-free so the mode branch stays unit-testable.
    """

    roots, extrema = found
    if mode == "ROOTS":
        return roots, []
    if mode == "EXTREMA":
        return [], extrema
    if mode == "BOTH":
        return roots, extrema
    return [], []


def point_coordinate_latex(x: float, y: float) -> str:
    """Compact ``(x,y)`` key-point label text with dot-decimal numbers (pure)."""

    return rf"({format_number(x)},{format_number(y)})"


def tick_decimal_places(step: float) -> int:
    """Decimal places axis ticks need to show ``step`` exactly (pure; cap 6).

    Integral steps (1, 2, 40) display zero places so ticks read ``2``, ``40``
    instead of ``2.0``, ``40.0``; fractional steps (0.2, 0.5, 2.5) keep their
    smallest exact representation.
    """

    magnitude = abs(float(step))
    if magnitude == 0 or magnitude == int(magnitude):
        return 0
    for places in range(1, 6):
        scaled = magnitude * 10**places
        if abs(scaled - round(scaled)) < 1e-9:
            return places
    return 6


def _place_point_labels(labels: Any, dots: Any, axes: Any) -> None:
    """Positions each coordinate label above its dot and resolves collisions.

    Adjacent labels are pushed apart with a right-walking pass, then every
    label is clamped just inside the axes span so none clips the card edge.
    """

    import manim as mn

    for label, dot in zip(list(labels), list(dots)):
        label.next_to(dot, mn.UP, buff=0.11)
    ordered = sorted(list(labels), key=lambda mobject: mobject.get_left()[0])
    for left, right in zip(ordered, ordered[1:]):
        deficit = left.get_right()[0] + 0.08 - right.get_left()[0]
        if deficit > 0:
            right.shift(mn.RIGHT * deficit)
    left_edge = axes.get_left()[0] - 0.1
    right_edge = axes.get_right()[0] + 0.1
    for label in list(labels):
        excess = label.get_right()[0] - right_edge
        if excess > 0:
            label.shift(mn.LEFT * excess)
        deficit = left_edge - label.get_left()[0]
        if deficit > 0:
            label.shift(mn.RIGHT * deficit)


def _function_graph_board(params: dict[str, Any], frame_w: float) -> SegmentBoard:
    """Card for ``function-graph``: labeled axes, family curve, optional key points.

    Self-contained per D-08 — the paused last frame shows the equation label,
    axis names, and any key-point dots with ``(x,y)`` coordinate labels, so it
    teaches without motion.
    """

    import manim as mn

    family = params["family"]
    coeffs = curve_coefficients(family, params)
    x_min = float(params["xMin"])
    x_max = float(params["xMax"])
    if x_max <= x_min:
        x_max = x_min + 1.0

    runs = sample_curve_runs(family, coeffs, x_min, x_max)
    flat_values = [y for run in runs for _, y in run]
    key_mode = params["keyPoints"]
    if key_mode == "NONE":
        roots, extrema = [], []
    else:
        roots, extrema = select_key_points(
            key_mode, find_key_points(family, coeffs, x_min, x_max)
        )

    marked = [
        evaluate_curve(family, coeffs, point)
        for point in (*roots, *extrema)
    ]
    y_lo, y_hi = _view_y_range(
        params, flat_values + [value for value in marked if value is not None]
    )
    if y_hi - y_lo < 1e-9:
        y_hi = y_lo + 1.0

    x_step = _axis_step(x_max - x_min)
    y_step = _axis_step(y_hi - y_lo)
    axes = mn.Axes(
        x_range=[x_min, x_max, x_step],
        y_range=[y_lo, y_hi, y_step],
        x_length=min(frame_w - 4.6, 8.4),
        y_length=3.3,
        tips=False,
        axis_config={"include_numbers": True, "font_size": 22},
        x_axis_config={
            "decimal_number_config": {"num_decimal_places": tick_decimal_places(x_step)}
        },
        y_axis_config={
            "decimal_number_config": {"num_decimal_places": tick_decimal_places(y_step)}
        },
    ).set_color(_ACCENT_BLUE)
    labels = axes.get_axis_labels(mn.MathTex("x", font_size=30), mn.MathTex("y", font_size=30))

    curve = mn.VGroup(
        *[
            mn.VMobject(stroke_color=_ACCENT_GREEN, stroke_width=3.4).set_points_as_corners(
                [axes.c2p(x, y) for x, y in run]
            )
            for run in runs
        ]
    )

    dots = mn.VGroup()
    point_labels = mn.VGroup()
    for point in roots:
        value = evaluate_curve(family, coeffs, point)
        if value is None:
            continue
        anchor = axes.c2p(point, value)
        dots.add(mn.Dot(anchor, radius=0.055, color=mn.WHITE))
        point_labels.add(
            mn.MathTex(point_coordinate_latex(point, value), font_size=24, color=mn.WHITE)
        )
    for point in extrema:
        value = evaluate_curve(family, coeffs, point)
        if value is None:
            continue
        anchor = axes.c2p(point, value)
        dots.add(mn.Dot(anchor, radius=0.055, color=_ACCENT_AMBER))
        point_labels.add(
            mn.MathTex(point_coordinate_latex(point, value), font_size=24, color=_ACCENT_AMBER)
        )
    _place_point_labels(point_labels, dots, axes)

    # Curve, dots, and their coordinate labels must live in the same VGroup as
    # the axes so arrange/scale keep them on the ticks and FadeOut of the card
    # does not leave ghosts.
    plot = mn.VGroup(axes, labels, curve, dots, point_labels)
    equation = mn.MathTex(equation_latex(family, coeffs), font_size=34, color=mn.WHITE)
    column = [equation, plot]
    caption_text = params.get("caption")
    caption = None
    if isinstance(caption_text, str) and caption_text.strip():
        caption = mn.MathTex(
            markup.tex_for_manim(caption_text), font_size=30, color=_ACCENT_AMBER
        )
        column.append(caption)
    content = mn.VGroup(*column).arrange(mn.DOWN, buff=0.26).move_to(mn.ORIGIN)
    if content.width > frame_w - 1.6:
        content.scale_to_fit_width(frame_w - 1.6)
    box, body = framed_card(content, stroke=mn.ManimColor(_ACCENT_BLUE), pad=0.42)

    group = mn.VGroup(box, body).move_to(mn.ORIGIN)
    glyphs = [equation, curve, dots, point_labels]
    if caption is not None:
        glyphs.append(caption)
    return SegmentBoard(group=group, frames=[box, axes, labels], writings=glyphs)


def _number_line_interval_board(params: dict[str, Any], frame_w: float) -> SegmentBoard:
    """Card for ``number-line-interval``: white number line, green covered span.

    The unhighlighted line stays white so the finite/infinite interval reads as
    the green span (D-12). Hollow ring vs filled dot is the open/closed
    distinction (semantic, D-08); arrowheads mark infinite ends. Endpoint
    numbers are dot-decimal regardless of explanation language.
    """

    import manim as mn

    left_infinite = params["leftInf"] == "INFINITE"
    right_infinite = params["rightInf"] == "INFINITE"
    left_value = None if left_infinite else _optional_endpoint(params, "left")
    right_value = None if right_infinite else _optional_endpoint(params, "right")
    domain_lo, domain_hi, mark_left, mark_right = interval_layout(
        left_value, right_value, left_infinite, right_infinite
    )

    def position(value: float) -> Any:
        fraction = (value - domain_lo) / (domain_hi - domain_lo)
        return mn.LEFT * (frame_w / 2 - 0.7) + mn.RIGHT * fraction * (frame_w - 1.4)

    line_span = frame_w - 1.6
    line = mn.Line(
        mn.LEFT * line_span / 2,
        mn.RIGHT * line_span / 2,
        stroke_color=mn.WHITE,
        stroke_width=4,
    )
    span_lo = domain_lo if left_value is None else left_value
    span_hi = domain_hi if right_value is None else right_value
    highlight = mn.VGroup()
    if span_hi > span_lo:
        highlight.add(
            mn.Line(
                position(span_lo),
                position(span_hi),
                stroke_color=mn.ManimColor(_ACCENT_GREEN),
                stroke_width=9,
            )
        )
    arrows = mn.VGroup()
    if left_infinite:
        arrows.add(
            mn.Arrow(
                mn.ORIGIN,
                mn.LEFT * 0.55,
                buff=0,
                stroke_color=mn.ManimColor(_ACCENT_GREEN),
                stroke_width=4,
                max_tip_length_to_length_ratio=0.5,
            ).move_to(line.get_start(), aligned_edge=mn.LEFT)
        )
    if right_infinite:
        arrows.add(
            mn.Arrow(
                mn.ORIGIN,
                mn.RIGHT * 0.55,
                buff=0,
                stroke_color=mn.ManimColor(_ACCENT_GREEN),
                stroke_width=4,
                max_tip_length_to_length_ratio=0.5,
            ).move_to(line.get_end(), aligned_edge=mn.RIGHT)
        )

    endpoint_marks = mn.VGroup()
    # Bound types are optional on infinite ends (D-08), so each bound value is read lazily,
    # only for an end that actually draws a mark.
    for value, bound_key, show_mark in (
        (left_value, "leftBound", mark_left),
        (right_value, "rightBound", mark_right),
    ):
        if not show_mark or value is None:
            continue
        bound = params.get(bound_key)
        anchor = position(value)
        if bound == "OPEN":
            mark = mn.Circle(
                radius=0.085,
                stroke_color=mn.WHITE,
                stroke_width=3.4,
                fill_color=mn.BLACK,
                fill_opacity=1.0,
            ).move_to(anchor)
        else:
            mark = mn.Dot(anchor, radius=0.085, color=mn.WHITE)
        tick = mn.Line(
            anchor + mn.UP * 0.12, anchor + mn.DOWN * 0.12, stroke_color=mn.WHITE, stroke_width=2.4
        )
        number = mn.MathTex(format_number(value), font_size=30, color=mn.WHITE)
        number.next_to(anchor, mn.DOWN, buff=0.16)
        endpoint_marks.add(mark, tick, number)

    row = mn.VGroup(line, highlight, arrows, endpoint_marks).move_to(mn.ORIGIN)
    column: list[Any] = [row]
    glyphs: list[Any] = [endpoint_marks]
    set_label_text = params.get("setLabel")
    if isinstance(set_label_text, str) and set_label_text.strip():
        label = mn.MathTex(
            markup.tex_for_manim(set_label_text), font_size=38, color=mn.WHITE
        )
        column.insert(0, label)
        glyphs.insert(0, label)
    content = mn.VGroup(*column).arrange(mn.DOWN, buff=0.42).move_to(mn.ORIGIN)
    if content.width > frame_w - 1.6:
        content.scale_to_fit_width(frame_w - 1.6)
    box, body = framed_card(content, stroke=mn.ManimColor(_ACCENT_GREEN), pad=0.46)
    group = mn.VGroup(box, body).move_to(mn.ORIGIN)
    return SegmentBoard(
        group=group, frames=[box, line, highlight, arrows], writings=glyphs
    )


def _union_scope_ends(scope: dict[str, Any]) -> tuple[float | None, float | None]:
    """Effective endpoints of one scope; None marks an infinite end."""

    def finite_end(number_key: str, inf_key: str) -> float | None:
        if scope.get(inf_key) == "INFINITE":
            return None
        value = scope.get(number_key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        return float(value)

    return finite_end("left", "leftInf"), finite_end("right", "rightInf")


def _number_line_union_board(params: dict[str, Any], frame_w: float) -> SegmentBoard:
    """Card for ``number-line-union``: every covered span highlighted green.

    Modeled on ``_number_line_interval_board`` and shares its semantics per
    scope end (hollow ring vs filled dot, arrowheads for infinite ends,
    dot-decimal numbers). Spans are drawn as-is — union rendering, no set
    algebra, so overlapping scopes simply overdraw. The label below the line
    is the auto-generated interval notation unless ``setLabel`` overrides it.
    """

    import manim as mn

    scopes = [
        scope for scope in params.get("scopes") or [] if isinstance(scope, dict)
    ]
    ends = [_union_scope_ends(scope) for scope in scopes]
    finite_values = [value for pair in ends for value in pair if value is not None]
    if len(finite_values) >= 2:
        lo, hi = min(finite_values), max(finite_values)
    elif len(finite_values) == 1:
        lo = hi = finite_values[0]
    else:
        lo, hi = -1.0, 1.0  # purely infinite scopes; any readable scale works
    margin = max((hi - lo) * 0.35, 1.0)
    domain_lo = lo - margin
    domain_hi = hi + margin
    if any(scope.get("leftInf") == "INFINITE" for scope in scopes):
        domain_lo -= margin
    if any(scope.get("rightInf") == "INFINITE" for scope in scopes):
        domain_hi += margin
    if domain_hi <= domain_lo:
        domain_hi = domain_lo + 1.0

    def position(value: float) -> Any:
        fraction = (value - domain_lo) / (domain_hi - domain_lo)
        return mn.LEFT * (frame_w / 2 - 0.7) + mn.RIGHT * fraction * (frame_w - 1.4)

    line_span = frame_w - 1.6
    line = mn.Line(
        mn.LEFT * line_span / 2,
        mn.RIGHT * line_span / 2,
        stroke_color=mn.WHITE,
        stroke_width=4,
    )
    arrows = mn.VGroup()
    if any(scope.get("leftInf") == "INFINITE" for scope in scopes):
        arrows.add(
            mn.Arrow(
                mn.ORIGIN,
                mn.LEFT * 0.55,
                buff=0,
                stroke_color=mn.ManimColor(_ACCENT_GREEN),
                stroke_width=4,
                max_tip_length_to_length_ratio=0.5,
            ).move_to(line.get_start(), aligned_edge=mn.LEFT)
        )
    if any(scope.get("rightInf") == "INFINITE" for scope in scopes):
        arrows.add(
            mn.Arrow(
                mn.ORIGIN,
                mn.RIGHT * 0.55,
                buff=0,
                stroke_color=mn.ManimColor(_ACCENT_GREEN),
                stroke_width=4,
                max_tip_length_to_length_ratio=0.5,
            ).move_to(line.get_end(), aligned_edge=mn.RIGHT)
        )

    highlights = mn.VGroup()
    scope_index_labels = mn.VGroup()
    for index, (scope, (left_value, right_value)) in enumerate(zip(scopes, ends)):
        span_lo = left_value if left_value is not None else domain_lo
        span_hi = right_value if right_value is not None else domain_hi
        if span_hi <= span_lo:
            continue
        color = union_scope_color(index)
        start = position(span_lo)
        finish = position(span_hi)
        highlights.add(
            mn.Line(
                start,
                finish,
                stroke_color=mn.ManimColor(color),
                stroke_width=9,
            )
        )
        # Numbered tag maps this span to "Scope N" in the editor and to the
        # matching fragment of the union notation below the line.
        tag = mn.MathTex(str(index + 1), font_size=26, color=mn.ManimColor(color))
        tag.next_to((start + finish) / 2, mn.UP, buff=0.14)
        scope_index_labels.add(tag)

    endpoint_marks = mn.VGroup()
    for scope, (left_value, right_value) in zip(scopes, ends):
        # Bound types exist only on FINITE ends (D-08/D-10), so each bound is read lazily.
        for value, bound_key in (
            (left_value, "leftBound"),
            (right_value, "rightBound"),
        ):
            if value is None:
                continue
            bound = scope.get(bound_key)
            anchor = position(value)
            if bound == "OPEN":
                mark = mn.Circle(
                    radius=0.085,
                    stroke_color=mn.WHITE,
                    stroke_width=3.4,
                    fill_color=mn.BLACK,
                    fill_opacity=1.0,
                ).move_to(anchor)
            else:
                mark = mn.Dot(anchor, radius=0.085, color=mn.WHITE)
            tick = mn.Line(
                anchor + mn.UP * 0.12,
                anchor + mn.DOWN * 0.12,
                stroke_color=mn.WHITE,
                stroke_width=2.4,
            )
            number = mn.MathTex(format_number(value), font_size=30, color=mn.WHITE)
            number.next_to(anchor, mn.DOWN, buff=0.16)
            endpoint_marks.add(mark, tick, number)

    row = mn.VGroup(line, highlights, arrows, endpoint_marks, scope_index_labels).move_to(
        mn.ORIGIN
    )
    column: list[Any] = [row]
    glyphs: list[Any] = [endpoint_marks, scope_index_labels]
    set_label_text = params.get("setLabel")
    if isinstance(set_label_text, str) and set_label_text.strip():
        label = mn.MathTex(
            markup.tex_for_manim(set_label_text), font_size=38, color=mn.WHITE
        )
    else:
        # Color-matched fragments so each ``\\cup`` piece names its span.
        fragments = interval_notation_parts(scopes)
        pieces: list[Any] = []
        for index, fragment in enumerate(fragments):
            if pieces:
                pieces.append(mn.MathTex(r"\cup", font_size=38, color=mn.WHITE))
            pieces.append(
                mn.MathTex(
                    fragment, font_size=38, color=mn.ManimColor(union_scope_color(index))
                )
            )
        label = mn.VGroup(*pieces).arrange(mn.RIGHT, buff=0.12) if pieces else mn.VGroup()
    column.append(label)
    glyphs.append(label)
    content = mn.VGroup(*column).arrange(mn.DOWN, buff=0.42).move_to(mn.ORIGIN)
    if content.width > frame_w - 1.6:
        content.scale_to_fit_width(frame_w - 1.6)
    box, body = framed_card(content, stroke=mn.ManimColor(_ACCENT_GREEN), pad=0.46)
    group = mn.VGroup(box, body).move_to(mn.ORIGIN)
    return SegmentBoard(group=group, frames=[box, line, highlights, arrows], writings=glyphs)


def compose_markup(
    text: str,
    *,
    language: str,
    font_size: int,
    weight=None,
    color=None,
    max_width: float | None = None,
    wrap_width: int = 36,
):
    """Builds a wrapped VGroup of Text + MathTex from mixed ``\\(...\\)`` markup."""

    import manim as mn

    fill = color if color is not None else mn.WHITE
    # DejaVu reports reliable bounding boxes for Latin; Noto Sans CJK is required for zh-CN.
    font = "Noto Sans CJK SC" if language == "zh-CN" else "DejaVu Sans"
    wrap = 18 if language == "zh-CN" else wrap_width
    rows = []
    for line in markup.wrap_markup_lines(text, width=wrap):
        pieces = []
        for kind, content in _collapse_text_runs(line):
            if kind == "tex":
                pieces.append(
                    mn.MathTex(markup.tex_for_manim(content), font_size=font_size + 2, color=fill)
                )
                continue
            kwargs: dict[str, Any] = {
                "font_size": font_size,
                "color": fill,
                "font": font,
            }
            if weight is not None:
                kwargs["weight"] = weight
            pieces.append(mn.Text(content, **kwargs))
        if not pieces:
            continue
        if len(pieces) == 1:
            rows.append(pieces[0])
        else:
            rows.append(mn.VGroup(*pieces).arrange(mn.RIGHT, buff=0.12, aligned_edge=mn.DOWN))
    if not rows:
        rows.append(mn.Text(" ", font_size=font_size, font=font, color=fill))
    group = mn.VGroup(*rows).arrange(mn.DOWN, aligned_edge=mn.LEFT, buff=0.16)
    if max_width is not None and group.width > max_width:
        group.scale_to_fit_width(max_width)
    return group


def _collapse_text_runs(line: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Joins adjacent prose tokens so one Manim Text owns a whole visual line."""

    collapsed: list[tuple[str, str]] = []
    for kind, content in line:
        if kind == "text" and collapsed and collapsed[-1][0] == "text":
            collapsed[-1] = ("text", collapsed[-1][1] + content)
        else:
            collapsed.append((kind, content))
    return collapsed


def framed_card(content, *, stroke, pad: float = 0.42):
    """Rounded teaching card around one content group (one card per segment)."""

    import manim as mn

    box = mn.RoundedRectangle(
        corner_radius=0.16,
        width=content.width + pad * 2,
        height=content.height + pad * 2,
        stroke_color=stroke,
        stroke_width=3,
        fill_color=mn.BLACK,
        fill_opacity=0.55,
    )
    content.move_to(box.get_center())
    return box, content


def _faststart(video_path: str, media_dir: str) -> str:
    output = os.path.join(media_dir, "final.mp4")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            video_path,
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            output,
        ],
        capture_output=True,
        timeout=600,
        check=True,
    )
    return output


def _probe(path: str) -> dict[str, Any]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if completed.returncode != 0:
        raise RenderFailure("INTERNAL", "ffprobe failed on rendered output")
    payload = json.loads(completed.stdout)
    streams = [s for s in payload.get("streams", []) if s.get("codec_type") == "video"]
    if not streams:
        raise RenderFailure("INTERNAL", "rendered output has no video stream")
    stream = streams[0]
    return {
        "duration": float(payload.get("format", {}).get("duration") or 0.0),
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
    }


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
