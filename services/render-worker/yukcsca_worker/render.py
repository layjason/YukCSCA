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
from pathlib import Path
from typing import Any

from . import jobs, policy, registry, vtt


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

        video_path = _render(segments, service, durations, media_dir, job.id)
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
    segments: list[dict[str, Any]], service, durations: list[float], media_dir: str, job_id: str
) -> str:
    """Renders the scene with Manim CE + manim-voiceover; returns the MP4 path."""

    import manim as mn
    from manim_voiceover import VoiceoverScene

    class ScriptScene(VoiceoverScene):
        def construct(self) -> None:
            self.set_speech_service(service)
            for index, segment in enumerate(segments):
                with self.voiceover(text=segment["narrationText"]) as tracker:
                    # Each visual segment occupies the same deterministic duration that produced
                    # its WebVTT cue. The voiceover cache should report the same duration; using
                    # the probed value keeps rendering and captions on one timing authority.
                    run_time = durations[index]
                    self.play(*build_segment_animations(segment), run_time=run_time)

    mn.config.media_dir = media_dir
    mn.config.quality = "medium_quality"
    mn.config.frame_rate = 30
    mn.config.output_file = f"render-{job_id}.mp4"
    scene = ScriptScene()
    scene.render()
    return str(mn.config.get_dir("video_dir") / mn.config.output_file)


def build_segment_animations(segment: dict[str, Any]):
    """Builds one segment's reviewed visual action.

    The mapping from template action id to Manim animation is the reviewed
    template library itself; authored input never reaches code execution.
    """

    import manim as mn

    action_id = segment["templateActionId"]
    params = segment.get("params") or {}
    if action_id == "title-heading":
        text = mn.Text(params["text"], font_size=52).move_to(mn.ORIGIN)
        return (mn.Write(text),)
    if action_id == "concept-definition":
        term = mn.Text(params["term"], font_size=44, weight=mn.BOLD).to_edge(mn.UP, buff=1.2)
        definition = (
            mn.Text(params["definition"], font_size=30, line_spacing=0.8)
            .scale_to_fit_width(mn.config.frame_width - 2)
            .next_to(term, mn.DOWN, buff=0.8)
        )
        return (mn.FadeIn(term, shift=mn.UP * 0.4), mn.FadeIn(definition, shift=mn.UP * 0.2))
    if action_id == "statement-text":
        text = (
            mn.Text(params["text"], font_size=32, line_spacing=0.8)
            .scale_to_fit_width(mn.config.frame_width - 2)
            .move_to(mn.ORIGIN)
        )
        return (mn.FadeIn(text, shift=mn.UP * 0.3),)
    if action_id == "worked-example-step":
        label = mn.Text(params["stepLabel"], font_size=30, weight=mn.BOLD).to_edge(mn.UP, buff=1.0)
        expression = mn.MathTex(params["expression"], font_size=44).next_to(label, mn.DOWN, buff=0.8)
        return (mn.FadeIn(label, shift=mn.DOWN * 0.3), mn.Write(expression))
    if action_id == "highlight-box":
        text = (
            mn.Text(params["text"], font_size=32, line_spacing=0.8)
            .scale_to_fit_width(mn.config.frame_width - 3)
            .move_to(mn.ORIGIN)
        )
        box = mn.SurroundingRectangle(text, color=mn.YELLOW, corner_radius=0.15)
        return (mn.Create(box), mn.FadeIn(text))
    raise RenderFailure("VALIDATION_FAILED", f"unknown action {action_id}")


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
