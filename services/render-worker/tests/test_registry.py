"""Registry mirror validation tests (stdlib only, no render stack)."""

from __future__ import annotations

import unittest
from unittest.mock import Mock

from yukcsca_worker import jobs, registry, render


def segment(action_id="title-heading", params=None, narration="Intro"):
    return {
        "templateActionId": action_id,
        "params": params if params is not None else {"text": "Quadratic equations"},
        "narrationText": narration,
    }


def spec(segments=None, language="id"):
    return {
        "explanationLanguage": language,
        "segments": segments if segments is not None else [segment()],
    }


class RegistryVersionTest(unittest.TestCase):
    def test_version_matches_java_registry(self):
        self.assertEqual(registry.VERSION, "2026-08.1")

    def test_pilot_library_contains_minimum_actions(self):
        ids = {action.id for action in registry.ACTIONS}
        self.assertIn("worked-example-step", ids)
        self.assertIn("concept-definition", ids)

    def test_render_rejects_a_mismatched_registry_before_side_effects(self):
        claimed = jobs.ClaimedJob(
            id="00000000-0000-0000-0000-000000000001",
            kind="RENDER_SCENE",
            scene_specification_id="00000000-0000-0000-0000-000000000002",
            video_asset_id=None,
            scene_snapshot='{"explanationLanguage":"id","segments":[]}',
            registry_version="obsolete",
            attempts=1,
        )

        with self.assertRaises(render.RenderFailure) as raised:
            render.run(claimed, Mock(), Mock())
        self.assertEqual(raised.exception.code, "VALIDATION_FAILED")


class ValidationTest(unittest.TestCase):
    def test_valid_specification_has_no_violations(self):
        self.assertEqual(registry.validate_specification(spec()), [])

    def test_unsupported_language(self):
        violations = registry.validate_specification(spec(language="fr"))
        self.assertIn(("explanationLanguage", "UNSUPPORTED"), violations)

    def test_empty_segments_collection_level(self):
        violations = registry.validate_specification(spec(segments=[]))
        self.assertIn(("segments", "OUT_OF_RANGE"), violations)

    def test_unknown_action_is_unsupported_with_segment_path(self):
        violations = registry.validate_specification(
            spec(segments=[segment(action_id="evil-action")])
        )
        self.assertIn(("segments[0].templateActionId", "UNSUPPORTED"), violations)

    def test_malformed_action_id_is_invalid(self):
        violations = registry.validate_specification(
            spec(segments=[segment(action_id="Bad_Id")])
        )
        self.assertIn(("segments[0].templateActionId", "INVALID"), violations)

    def test_missing_param_required(self):
        violations = registry.validate_specification(
            spec(segments=[segment(params={})])
        )
        self.assertIn(("segments[0].params.text", "REQUIRED"), violations)

    def test_unknown_param_is_unsupported(self):
        violations = registry.validate_specification(
            spec(segments=[segment(params={"text": "ok", "extra": 1})])
        )
        self.assertIn(("segments[0].params.extra", "UNSUPPORTED"), violations)

    def test_text_over_max_length(self):
        violations = registry.validate_specification(
            spec(segments=[segment(params={"text": "x" * 121})])
        )
        self.assertIn(("segments[0].params.text", "OUT_OF_RANGE"), violations)

    def test_integer_param_rejects_string(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="worked-example-step",
                        params={"stepLabel": "Step", "expression": "x^2", "order": "2"},
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.order", "UNSUPPORTED"), violations)

    def test_narration_bound(self):
        violations = registry.validate_specification(
            spec(segments=[segment(narration="a" * 601)])
        )
        self.assertIn(("segments[0].narrationText", "OUT_OF_RANGE"), violations)

    def test_non_object_segment(self):
        violations = registry.validate_specification(spec(segments=["nope"]))
        self.assertIn(("segments[0]", "INVALID"), violations)

    def test_math_expression_param(self):
        valid = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="worked-example-step",
                        params={"stepLabel": "Substitute", "expression": r"\frac{-b}{2a}"},
                        narration="Substitute the coefficients.",
                    )
                ]
            )
        )
        self.assertEqual(valid, [])

    def test_math_expression_rejects_tex_file_input(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="worked-example-step",
                        params={"stepLabel": "Read", "expression": r"\input{/etc/passwd}"},
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.expression", "INVALID"), violations)


if __name__ == "__main__":
    unittest.main()
