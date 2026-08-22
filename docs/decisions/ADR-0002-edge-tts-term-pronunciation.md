# ADR-0002 — Edge TTS for reviewed term pronunciation

| Field         | Value      |
| ------------- | ---------- |
| Status        | `ACCEPTED` |
| Date          | 2026-08-19 |
| Related slice | `VS-010A`  |
| Supersedes    | `ADR-0001` |

Chinese terminology cards must show pinyin and may play a short pronunciation. The product owner replaced the Azure Cognitive Services key path with the Microsoft Edge read-aloud protocol used by `edge_tts`. Voice remains `zh-CN-XiaoxiaoNeural`. YukCSCA keeps `SpeechSynthesisPort`; only the publish-time adapter changes.

Synthesis still runs **only at package publish**, for each reviewed Chinese surface form. Clips are stored as bounded `audio/mpeg` academic rows and served through authorized student and administrator GETs. Those GET paths never synthesize and never send selected text to a vendor. Pinyin remains on every card when audio is missing or failed. Tests mock the port. Object storage is not introduced. The Java service does not add a Python runtime; it speaks the same WebSocket protocol as `edge_tts`.

## Considered alternatives

- Keep Azure Speech with a subscription key — rejected; the product owner selected Edge TTS.
- Shell out to the Python `edge_tts` CLI — rejected; adds a second runtime to the modular monolith.
- Browser Web Speech API — cannot guarantee this voice or consistent quality.
- Live per-tap TTS — worse privacy, cost, and latency for minors.

## Consequences

- No speech subscription key. Publish requires `YUKCSCA_SPEECH_ENABLED=true` and outbound WebSocket access to Microsoft Edge TTS.
- The Edge read-aloud protocol is unofficial and can change (DRM token / Chromium version). Publish may succeed when synthesis fails; audio is optional, pinyin is not.
- Administrators hear the stored published clip, not a live preview of the draft.
- The same port may later serve `VS-010B` narration. Replacing the adapter then means re-rendering stored clips, not changing student lookup.
