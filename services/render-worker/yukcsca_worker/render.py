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
    raise RenderFailure("VALIDATION_FAILED", f"unknown action {action_id}")


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
