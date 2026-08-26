"""WebVTT derivation tests: two-line cues split at clause boundaries."""

from __future__ import annotations

import re
import unittest

from yukcsca_worker import vtt

_CUE_TIMING_RE = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}\.\d{3}) --> (?P<end>\d{2}:\d{2}:\d{2}\.\d{3})"
)


def parse_cues(captions: str) -> list[tuple[float, float, str]]:
    """Returns ``(start_seconds, end_seconds, payload)`` per cue, in file order."""

    lines = captions.splitlines()
    cues: list[tuple[float, float, str]] = []
    index = 0
    while index < len(lines):
        match = _CUE_TIMING_RE.fullmatch(lines[index])
        if match is None:
            index += 1
            continue
        payload_lines: list[str] = []
        cursor = index + 1
        while cursor < len(lines) and lines[cursor]:
            payload_lines.append(lines[cursor])
            cursor += 1
        cues.append(
            (
                _seconds(match.group("start")),
                _seconds(match.group("end")),
                "\n".join(payload_lines),
            )
        )
        index = cursor
    return cues


def _seconds(timestamp: str) -> float:
    hours, minutes, seconds = timestamp.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


class CaptionsFormatTest(unittest.TestCase):
    def test_header_and_cumulative_timing(self):
        captions = vtt.build_captions(
            ["Pertama.", "Kedua."],
            [2.5, 1.25],
        )
        lines = captions.splitlines()
        self.assertEqual(lines[0], "WEBVTT")
        self.assertIn("00:00:00.000 --> 00:00:02.500", lines)
        self.assertIn("00:00:02.500 --> 00:00:03.750", lines)
        self.assertIn("Pertama.", lines)
        self.assertIn("Kedua.", lines)

    def test_narration_is_authoritative_transcript(self):
        captions = vtt.build_captions(["Hello   world"], [1.0])
        self.assertIn("Hello world", captions)

    def test_hour_rollover_formatting(self):
        captions = vtt.build_captions(["End"], [3610.0])
        self.assertIn("01:00:10.000", captions)

    def test_mismatched_lengths_rejected(self):
        with self.assertRaises(ValueError):
            vtt.build_captions(["a"], [1.0, 2.0])


class TwoLineCuePackingTest(unittest.TestCase):
    LONG_LATIN_NARRATION = (
        "The quadratic formula gives both roots of any polynomial equation. "
        "Next we substitute the coefficients and simplify the discriminant step. "
        "Because the discriminant stays positive there are two real solutions. "
        "Finally we plot the parabola and mark where each root crosses zero."
    )

    def test_long_latin_narration_yields_multiple_two_line_cues_in_order(self):
        captions = vtt.build_captions([self.LONG_LATIN_NARRATION], [12.0])
        cues = parse_cues(captions)
        self.assertGreater(len(cues), 1)
        payloads = [text for _, _, text in cues]
        # Order preserved: the cues concatenate back to the narration text.
        self.assertEqual(" ".join(payloads), " ".join(self.LONG_LATIN_NARRATION.split()))
        for text in payloads:
            # Pure Latin: at most two display lines of <= 42 chars each.
            self.assertLessEqual(len(text), 84)
            self.assertGreater(len(text), 0)

    def test_zh_cn_punctuation_splits_clauses(self):
        narration = (
            "二次函数的图像是一条抛物线。当系数a大于零的时候开口向上。"
            "顶点坐标就是它的最低点。我们再来看一看对称轴到底在哪里。"
        )
        captions = vtt.build_captions([narration], [10.0])
        cues = parse_cues(captions)
        self.assertGreater(len(cues), 1)
        payloads = [text for _, _, text in cues]
        self.assertEqual("".join(payloads), narration)
        for text in payloads:
            # zh-CN budget: at most two display lines of <= 20 chars each.
            self.assertLessEqual(len(text), 40)
            self.assertTrue(text.endswith("。"))

    def test_inline_latex_span_never_split_across_cues(self):
        narration = (
            "The value becomes \\(3.5\\) meters long. "
            "Then \\(x^2\\) stays positive, so \\(y = 2\\) holds."
        )
        captions = vtt.build_captions([narration], [8.0])
        cues = parse_cues(captions)
        payloads = [text for _, _, text in cues]
        self.assertEqual(" ".join(payloads), " ".join(narration.split()))
        for text in payloads:
            self.assertEqual(text.count("\\("), text.count("\\)"))
        whole_span_cue = [text for text in payloads if "3.5" in text]
        self.assertEqual(len(whole_span_cue), 1)
        self.assertIn("\\(3.5\\)", whole_span_cue[0])


class CueTimingTest(unittest.TestCase):
    def test_timing_continuity_and_exact_segment_end(self):
        narrations = [
            "The quadratic formula gives both roots of any equation. "
            "Next we substitute the coefficients and simplify them. "
            "Because the discriminant stays positive roots are real.",
            "Tail.",
        ]
        durations = [9.0, 1.5]
        captions = vtt.build_captions(narrations, durations)
        cues = parse_cues(captions)
        self.assertGreater(len(cues), 2)
        previous_end = 0.0
        for start, end, _ in cues:
            self.assertAlmostEqual(start, previous_end, places=3)
            self.assertGreater(end, start)
            previous_end = end
        # No gaps anywhere: segment starts abut and cues fill their segment,
        # and the very last cue ends exactly at the summed duration.
        self.assertAlmostEqual(previous_end, sum(durations), places=3)

    def test_minimum_duration_merging(self):
        captions = vtt.build_captions(["Aa. Bb. Cc. Dd. Ee. Ff."], [4.0])
        cues = parse_cues(captions)
        # Six proportional sub-second spans merge down; none stays below ~1s.
        self.assertLess(len(cues), 6)
        for start, end, _ in cues:
            self.assertGreaterEqual(end - start, 0.999)
        self.assertEqual(
            " ".join(text for _, _, text in cues), "Aa. Bb. Cc. Dd. Ee. Ff."
        )
        self.assertAlmostEqual(cues[-1][1], 4.0, places=3)

    def test_merge_prefers_partner_that_keeps_two_line_budget(self):
        # One tiny clause ahead of two long ones in a short segment: the single
        # required merge absorbs it into a neighbor without breaching 2 lines.
        narration = (
            "B. "
            "Akar persamaan kuadrat dapat ditemukan dengan pemfaktoran bentuk tersebut. "
            "Diskriminan menentukan banyak akar real persamaan kuadrat tersebut."
        )
        captions = vtt.build_captions([narration], [3.4])
        cues = parse_cues(captions)
        self.assertLess(len(cues), 3)
        for start, end, text in cues:
            self.assertLessEqual(vtt._line_estimate(text), vtt.MAX_CUE_LINES, text)
            self.assertGreaterEqual(end - start, 0.999)

    def test_merge_keeps_two_line_budget_even_on_a_short_segment(self):
        # Two ~2-line clauses in a 1.2s segment: no merge fits the budget, so
        # each clause stays its own cue (possibly sub-second) rather than one
        # overfull frame.
        narration = (
            "Akar persamaan kuadrat dapat ditemukan dengan pemfaktoran bentuk sempurna. "
            "Diskriminan menentukan banyak akar real persamaan kuadrat tersebut."
        )
        captions = vtt.build_captions([narration], [1.2])
        cues = parse_cues(captions)
        self.assertEqual(len(cues), 2)
        for start, end, text in cues:
            self.assertLessEqual(vtt._line_estimate(text), vtt.MAX_CUE_LINES, text)
            self.assertGreater(end, start)
        self.assertAlmostEqual(cues[0][0], 0.0, places=3)
        self.assertAlmostEqual(cues[-1][1], 1.2, places=3)

    def test_short_narration_stays_one_cue(self):
        captions = vtt.build_captions(["Halo."], [2.0])
        cues = parse_cues(captions)
        self.assertEqual(len(cues), 1)
        start, end, text = cues[0]
        self.assertAlmostEqual(start, 0.0, places=3)
        self.assertAlmostEqual(end, 2.0, places=3)
        self.assertEqual(text, "Halo.")

    def test_empty_narration_keeps_placeholder_cue(self):
        captions = vtt.build_captions([""], [1.5])
        cues = parse_cues(captions)
        self.assertEqual(len(cues), 1)
        self.assertEqual(cues[0][2], "(narration)")


if __name__ == "__main__":
    unittest.main()
