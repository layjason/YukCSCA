"""Duration/size policy tests (AC-10)."""

from __future__ import annotations

import unittest

from yukcsca_worker import policy


class SegmentDurationPolicyTest(unittest.TestCase):
    def test_within_bounds_passes(self):
        self.assertIsNone(policy.check_segment_durations([10.0, 25.5, 3.2]))

    def test_single_segment_over_bound_fails(self):
        detail = policy.check_segment_durations([10.0, policy.MAX_SEGMENT_SECONDS + 1])
        self.assertIsNotNone(detail)
        self.assertIn("segment 1", detail)

    def test_total_over_bound_fails(self):
        durations = [policy.MAX_SEGMENT_SECONDS] * 6  # 720s total
        detail = policy.check_segment_durations(durations)
        self.assertIsNotNone(detail)
        self.assertIn("total", detail)

    def test_non_positive_duration_fails(self):
        self.assertIsNotNone(policy.check_segment_durations([0.0]))


class ProbePolicyTest(unittest.TestCase):
    def test_valid_probe_passes(self):
        self.assertIsNone(policy.check_probe(1024, 90.0, 1280, 720))

    def test_oversized_upload_fails(self):
        self.assertIsNotNone(policy.check_probe(policy.MAX_BYTES + 1, 10.0, 1280, 720))

    def test_over_duration_fails(self):
        self.assertIsNotNone(
            policy.check_probe(1024, policy.MAX_TOTAL_SECONDS + 1, 1280, 720)
        )

    def test_over_resolution_fails(self):
        self.assertIsNotNone(policy.check_probe(1024, 10.0, 4096, 2160))


if __name__ == "__main__":
    unittest.main()
