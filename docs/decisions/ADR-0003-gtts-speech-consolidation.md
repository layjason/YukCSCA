# ADR-0003 — gTTS speech consolidation for term pronunciation and lesson-video narration

| Field         | Value                         |
| ------------- | ----------------------------- |
| Status        | `ACCEPTED`                    |
| Date          | 2026-08-22                    |
| Related slice | `VS-010B` (affects `VS-010A`) |
| Supersedes    | `ADR-0002`                    |

The product owner consolidated all speech synthesis on gTTS. `VS-010B` narration is synthesized inside the isolated Python render worker through a pinned `manim-voiceover` gTTS service (without the ASR `transcribe` extra); reviewed Chinese term pronunciation moves from the Microsoft Edge read-aloud protocol to a gTTS adapter behind the unchanged `SpeechSynthesisPort`, still publish-time only, still `zh-CN`. `YukCSCA` never presents synthesized speech as reviewed content authority: term clips sit beside always-visible pinyin, and narration exists only inside a Draft video a human reviews before publication.

Subtitles and synchronization stay deterministic without speech recognition: each scene-specification segment pairs narration text with a visual action, per-segment audio durations come from probing the synthesized audio, visual segments render for exactly those durations, and WebVTT cues are derived from segment boundaries with the narration text as the authoritative transcript. Captions are therefore segment-level, not word-level; the requirements demand captions or transcript, not word timing.

## Considered alternatives

- Edge read-aloud protocol with WordBoundary timing (the `ADR-0002` path extended, or the maintained `edge-tts` package in the worker) — declined by the product owner in favour of one gTTS vendor surface.
- `manim-voiceover` with the `transcribe` extra (faster-whisper) for word-level cues — declined; adds an ASR dependency that can mis-transcribe mathematical notation, on a plugin whose timing stack is in migration.
- Azure Cognitive Services speech — superseded twice (see `ADR-0001`, `ADR-0002`).

## Consequences

- gTTS has no word-boundary events: caption cues remain segment-level until a future slice deliberately adds the transcribe extra or another timing source.
- Published term clips change voice (Google Translate zh-CN voice instead of `zh-CN-XiaoxiaoNeural`) and are re-synthesized the next time each package publishes; pinyin fallback and "publish may succeed when synthesis fails" are unchanged.
- The Java gTTS adapter speaks the Google Translate TTS HTTPS endpoint (including its public token algorithm) directly; the Java service still adds no Python runtime. Worker-side synthesis runs only inside the isolated render worker, and tests stub both seams so CI never contacts the vendor.
- Both gTTS and the Edge protocol are unofficial endpoints that can change; consolidation reduces this to one egress domain and one failure mode. Outbound configuration moves from WebSocket to HTTPS, and the retired Edge protocol constant is removed from the secret-scan allowlist with the adapter.
- Reversal cost is low: synthesis sits behind `SpeechSynthesisPort` on the Java side and a single worker service seam; swapping vendors again means replacing adapters, not flows.
