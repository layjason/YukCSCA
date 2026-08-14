# ADR-0001 — Azure Speech for reviewed term pronunciation

| Field         | Value      |
| ------------- | ---------- |
| Status        | `ACCEPTED` |
| Date          | 2026-08-14 |
| Related slice | `VS-010A`  |

Chinese Mathematics terminology cards must show pinyin and may play a short pronunciation. The product owner selected Azure Neural voice `zh-CN-XiaoxiaoNeural`. YukCSCA therefore introduces a `SpeechSynthesisPort` on this slice, earlier than the `VS-010B` narration candidate.

Synthesis runs **only at package publish**, for each reviewed Chinese surface form. The resulting short clip is stored as a bounded academic asset and served through an authorized student GET. The student path never calls Azure and never sends selected text to a vendor. Pinyin remains on every card when audio is missing or failed. Tests mock the port. Object storage is not introduced for these clips.

## Considered alternatives

- Pinyin only — rejected; voice is an accepted addition.
- Browser Web Speech API — cannot guarantee this voice or consistent quality.
- Live per-tap Azure TTS — worse privacy, cost, and latency for minors.
- Wait for `VS-010B` video narration — would leave the terminology card silent.

## Consequences

- First outbound speech provider and secret (`YUKCSCA` speech settings). Timeouts, a per-publish clip budget, and mock-only CI are required.
- Publish may succeed when synthesis fails; audio is optional, pinyin is not.
- The same port may later serve `VS-010B` narration. Replacing Azure then means re-rendering stored clips, not changing student lookup.
