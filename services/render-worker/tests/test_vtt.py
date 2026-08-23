"""WebVTT derivation tests: segment-level captions from probed durations."""

from __future__ import annotations

import unittest

from yukcsca_worker import vtt


class CaptionsTest(unittest.TestCase):
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

    def test_long_narration_wraps_within_cue(self):
        captions = vtt.build_captions(["word " * 40], [5.0])
        cue_lines = [
            line
            for line in captions.splitlines()
            if line and not line[0].isdigit() and "-->" not in line and line != "WEBVTT"
        ]
        self.assertGreater(len(cue_lines), 1)
        self.assertTrue(all(len(line) <= 80 for line in cue_lines))

    def test_hour_rollover_formatting(self):
        captions = vtt.build_captions(["End"], [3610.0])
        self.assertIn("01:00:10.000", captions)

    def test_mismatched_lengths_rejected(self):
        with self.assertRaises(ValueError):
            vtt.build_captions(["a"], [1.0, 2.0])


if __name__ == "__main__":
    unittest.main()
