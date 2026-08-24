# YukCSCA render worker (VS-010B)

Isolated Python worker that executes the asynchronous jobs of the reviewed
lesson-video pipeline (`VS-010B`, decisions `D-01`–`D-04`, `ADR-0003`):

- `VALIDATE_UPLOAD` — probes an uploaded finished video (MIME signature, MP4
  container, duration, resolution, size), re-muxes it with
  `-movflags +faststart`, and moves the asset to `DRAFT`; a rejected probe
  marks the asset `REJECTED` with bounded reasons.
- `RENDER_SCENE` — re-validates the snapshotted scene specification against
  the mirrored reviewed template registry, synthesizes per-segment gTTS
  narration (pinned `manim-voiceover` gTTS service, **without** the
  `transcribe` extra), renders the visual segments with pinned Manim CE,
  enforces the per-segment/total duration policy, derives segment-level WebVTT
  captions from the probed audio durations, and creates a `PRODUCED` asset
  directly in `DRAFT`.

The worker executes **no authored scene code** — it consumes only
schema-validated scene data (requirement V1.7). Visual mapping of the five
reviewed actions uses one card per segment: the previous card fades out, then
frames are stroke-drawn (`Create`) and glyphs/equations are written (`Write`)
over the narration window. Mixed prose + inline TeX (`\(...\)`), and Noto CJK
for `zh-CN`. Subject-specific open-source Manim scenes are not loaded as
executable templates.

It claims jobs from the
`render_job` table with `FOR UPDATE SKIP LOCKED` and a visibility timeout,
retries transient failures with linear backoff inside the attempts bound, and
fails terminally with a bounded error code (`RenderJobErrorCode`); terminal
failures create no asset and never block package publication.

Pinned stack: Manim CE 0.21.0, manim-voiceover 0.4.0 (gtts extra only), gTTS
2.5.4, psycopg 3.3.4, boto3 1.43.78, FFmpeg/FFprobe, a bounded TeX Live set
(for `MathTex` worked-example steps), and Noto CJK fonts (for `zh-CN` `Text`)
from the image. The registry mirror in `yukcsca_worker/registry.py` must stay
identical to the Java `SceneTemplateRegistry` (version `2026-08.1`).

## Local runs

`compose.yaml` wires this image with PostgreSQL and MinIO. Environment
variables are documented in `yukcsca_worker/config.py`
(`WORKER_DB_DSN`, `WORKER_S3_*`, `WORKER_MAX_ATTEMPTS`,
`WORKER_VISIBILITY_TIMEOUT_SECONDS`, `WORKER_RENDER_TIMEOUT_SECONDS`,
`WORKER_POLL_INTERVAL_SECONDS`).

## Tests

`tests/` covers the pure-stdlib modules (registry validation mirror, duration
policy, WebVTT derivation) and runs without the render stack:

```bash
python3 -m unittest discover -s tests -v
```
