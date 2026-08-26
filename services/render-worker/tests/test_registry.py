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
        self.assertEqual(registry.VERSION, "2026-08.3")

    def test_pilot_library_contains_minimum_actions(self):
        ids = {action.id for action in registry.ACTIONS}
        self.assertIn("worked-example-step", ids)
        self.assertIn("concept-definition", ids)

    def test_csca_math_actions_present_with_enum_choices(self):
        actions = {action.id: action for action in registry.ACTIONS}
        families = {
            descriptor.id: descriptor.choices
            for descriptor in actions["function-graph"].params
        }
        self.assertEqual(
            families["family"],
            ("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS"),
        )
        self.assertEqual(
            families["keyPoints"], ("NONE", "ROOTS", "EXTREMA", "BOTH")
        )
        bounds = {action.id for action in registry.ACTIONS}
        self.assertIn("number-line-interval", bounds)
        self.assertIn("number-line-union", bounds)
        self.assertIn("sequence-points", bounds)

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


def function_graph_params(**overrides):
    params = {
        "family": "LINEAR",
        "a": 2,
        "b": -1,
        "xMin": -10,
        "xMax": 10,
        "keyPoints": "NONE",
    }
    params.update(overrides)
    return dict(params)


def interval_params(**overrides):
    params = {
        "left": -3,
        "right": 8,
        "leftBound": "OPEN",
        "rightBound": "CLOSED",
        "leftInf": "FINITE",
        "rightInf": "FINITE",
    }
    params.update(overrides)
    return dict(params)


def sequence_params(**overrides):
    params = {
        "seqType": "GEOMETRIC",
        "firstTerm": 3,
        "ratioOrDiff": -2,
        "termCount": 6,
    }
    params.update(overrides)
    return dict(params)


class CscaMathValidationParityTest(unittest.TestCase):
    """Same (path, code) table the Java SceneSpecificationValidatorTest asserts."""

    def test_happy_path_function_graph_has_no_violations(self):
        violations = registry.validate_specification(
            spec(segments=[segment(action_id="function-graph", params=function_graph_params())])
        )
        self.assertEqual(violations, [])

    def test_happy_path_interval_and_sequence(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(action_id="number-line-interval", params=interval_params()),
                    segment(
                        action_id="sequence-points",
                        params=sequence_params(seqType="ARITHMETIC", ratioOrDiff=11),
                    ),
                ],
                language="en",
            )
        )
        self.assertEqual(violations, [])

    def test_enum_choice_outside_closed_set_is_invalid(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(family="TAN"),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.family", "INVALID"), violations)

    def test_enum_non_textual_value_is_invalid(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params=interval_params(leftBound=1),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.leftBound", "INVALID"), violations)

    def test_missing_linear_coefficient_is_required(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(b=None),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.b", "REQUIRED"), violations)

    def test_missing_trigonometric_coefficients_are_required(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(family="COS"),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.c", "REQUIRED"), violations)
        self.assertIn(("segments[0].params.d", "REQUIRED"), violations)

    def test_power_requires_exponent_without_irrelevant_coefficients(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(family="POWER"),
                    )
                ]
            )
        )
        self.assertEqual(violations, [("segments[0].params.n", "REQUIRED")])

    def test_quadratic_requires_constant_term_only(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(family="QUADRATIC"),
                    )
                ]
            )
        )
        self.assertEqual(violations, [("segments[0].params.c", "REQUIRED")])

    def test_missing_coefficient_a_is_required_once_for_every_family(self):
        """``a`` is descriptor-required for all families; the semantic table must not
        duplicate the violation, so exactly one REQUIRED is reported per family."""
        for family in ("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS"):
            violations = registry.validate_specification(
                spec(
                    segments=[
                        segment(
                            action_id="function-graph",
                            params=function_graph_params(
                                family=family, a=None, c=1, d=1, n=1, r=2, base=2
                            ),
                        )
                    ]
                )
            )
            self.assertEqual(
                violations,
                [("segments[0].params.a", "REQUIRED")],
                f"family={family}",
            )

    def test_multiple_violations_reported_once_in_descriptor_order(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(
                            family="EXP", a=2, r=-2, xMin=4, xMax=-4
                        ),
                    )
                ]
            )
        )
        self.assertEqual(
            violations,
            [
                ("segments[0].params.r", "OUT_OF_RANGE"),
                ("segments[0].params.xMax", "INVALID"),
            ],
        )

    def test_exponential_ratio_bounds(self):
        for ratio in (0, -1.5, 1):
            violations = registry.validate_specification(
                spec(
                    segments=[
                        segment(
                            action_id="function-graph",
                            params=function_graph_params(family="EXP", a=2, r=ratio),
                        )
                    ]
                )
            )
            self.assertIn(
                ("segments[0].params.r", "OUT_OF_RANGE"),
                violations,
                f"ratio={ratio}",
            )

    def test_logarithm_base_bounds(self):
        for base in (1, -3, 0):
            violations = registry.validate_specification(
                spec(
                    segments=[
                        segment(
                            action_id="function-graph",
                            params=function_graph_params(family="LOG", base=base),
                        )
                    ]
                )
            )
            self.assertIn(
                ("segments[0].params.base", "OUT_OF_RANGE"),
                violations,
                f"base={base}",
            )

    def test_inverted_x_axis_is_invalid_on_xmax(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="function-graph",
                        params=function_graph_params(xMin=4, xMax=-4),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.xMax", "INVALID"), violations)

    def test_finite_interval_left_past_right_is_invalid_on_right(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params=interval_params(left=5, right=5),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.right", "INVALID"), violations)

    def test_equal_endpoints_allowed_when_an_end_is_infinite(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params=interval_params(leftInf="INFINITE", left=5, right=5),
                    )
                ]
            )
        )
        self.assertEqual(violations, [])

    def test_omitted_left_bound_allowed_when_left_end_infinite(self):
        # D-10 display rules prune leftBound on an infinite end; the UI-saved shape must validate.
        violations = registry.validate_specification(
            spec(
                language="en",
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params={
                            "left": -2,
                            "right": 3,
                            "rightBound": "CLOSED",
                            "leftInf": "INFINITE",
                            "rightInf": "FINITE",
                        },
                    )
                ],
            )
        )
        self.assertEqual(violations, [])

    def test_finite_left_end_requires_left_bound_only(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params=interval_params(leftBound=None),
                    )
                ]
            )
        )
        self.assertEqual(violations, [("segments[0].params.leftBound", "REQUIRED")])

    def test_omitted_right_bound_allowed_when_right_end_infinite(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params={
                            "left": -3,
                            "right": 8,
                            "leftBound": "OPEN",
                            "leftInf": "FINITE",
                            "rightInf": "INFINITE",
                        },
                    )
                ]
            )
        )
        self.assertEqual(violations, [])

    def test_finite_right_end_requires_right_bound_only(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-interval",
                        params=interval_params(rightBound=None),
                    )
                ]
            )
        )
        self.assertEqual(violations, [("segments[0].params.rightBound", "REQUIRED")])

    def test_geometric_ratio_magnitude_bounded(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="sequence-points",
                        params=sequence_params(ratioOrDiff=-11),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.ratioOrDiff", "OUT_OF_RANGE"), violations)

    def test_arithmetic_difference_beyond_geometric_bound_is_allowed(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="sequence-points",
                        params=sequence_params(seqType="ARITHMETIC", ratioOrDiff=11),
                    )
                ],
                language="en",
            )
        )
        self.assertEqual(violations, [])


def union_scope(**overrides):
    scope = {
        "left": 5,
        "leftBound": "OPEN",
        "leftInf": "FINITE",
        "rightInf": "INFINITE",
    }
    scope.update(overrides)
    return {key: value for key, value in scope.items() if value is not None}


def union_params(scopes=None, **overrides):
    params = {"scopes": scopes if scopes is not None else [union_scope()]}
    params.update(overrides)
    return dict(params)


class NumberLineUnionParityTest(unittest.TestCase):
    """Same (path, code) table the Java SceneSpecificationValidatorTest asserts."""

    def test_happy_multi_scope_union_has_no_violations(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(
                            [
                                {
                                    "leftInf": "INFINITE",
                                    "right": 2,
                                    "rightBound": "CLOSED",
                                    "rightInf": "FINITE",
                                },
                                union_scope(),
                            ]
                        ),
                    )
                ]
            )
        )
        self.assertEqual(violations, [])

    def test_missing_bound_on_each_finite_end_uses_sub_item_path(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(
                            [
                                {
                                    "leftInf": "INFINITE",
                                    "right": 2,
                                    "rightBound": "CLOSED",
                                    "rightInf": "FINITE",
                                },
                                union_scope(leftBound=None),
                            ]
                        ),
                    )
                ]
            )
        )
        self.assertEqual(
            violations,
            [("segments[0].params.scopes[1].leftBound", "REQUIRED")],
        )

    def test_boolean_scope_endpoint_value_is_invalid(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(
                            [union_scope(left=True)],
                        ),
                    )
                ]
            )
        )
        self.assertEqual(
            violations,
            [("segments[0].params.scopes[0].left", "INVALID")],
        )

    def test_finite_scope_left_past_right_is_invalid_on_that_scope_right(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(
                            [
                                union_scope(
                                    left=3,
                                    leftInf="FINITE",
                                    right=3,
                                    rightBound="CLOSED",
                                    rightInf="FINITE",
                                )
                            ]
                        ),
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.scopes[0].right", "INVALID"), violations)
        self.assertNotIn(("segments[0].params.right", "INVALID"), violations)

    def test_endpoint_values_bounded_per_scope(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(
                            [
                                {
                                    "leftInf": "INFINITE",
                                    "right": 2,
                                    "rightBound": "CLOSED",
                                    "rightInf": "FINITE",
                                },
                                union_scope(left=100.5),
                            ]
                        ),
                    )
                ]
            )
        )
        self.assertEqual(
            violations,
            [("segments[0].params.scopes[1].left", "OUT_OF_RANGE")],
        )

    def test_five_scopes_out_of_range_on_the_composite(self):
        scopes = [
            union_scope(
                left=-10,
                leftInf="FINITE",
                right=10,
                rightBound="CLOSED",
                rightInf="FINITE",
            )
            for _ in range(5)
        ]
        violations = registry.validate_specification(
            spec(segments=[segment(action_id="number-line-union", params=union_params(scopes))])
        )
        self.assertEqual(violations, [("segments[0].params.scopes", "OUT_OF_RANGE")])

    def test_unknown_scope_field_is_unsupported_with_sub_field_path(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params([union_scope(middle=0)]),
                    )
                ]
            )
        )
        self.assertEqual(
            violations,
            [("segments[0].params.scopes[0].middle", "UNSUPPORTED")],
        )

    def test_non_object_scope_item_is_invalid(self):
        scopes = ["not-an-object", union_scope()]
        violations = registry.validate_specification(
            spec(segments=[segment(action_id="number-line-union", params=union_params(scopes))])
        )
        self.assertIn(("segments[0].params.scopes[0]", "INVALID"), violations)

    def test_composite_level_required_invalid_and_out_of_range(self):
        missing = registry.validate_specification(
            spec(
                segments=[
                    segment(action_id="number-line-union", params={})
                ]
            )
        )
        self.assertEqual(missing, [("segments[0].params.scopes", "REQUIRED")])

        not_array = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="number-line-union",
                        params=union_params(scopes="(-inf,2]"),
                    )
                ]
            )
        )
        self.assertEqual(not_array, [("segments[0].params.scopes", "INVALID")])

        empty = registry.validate_specification(
            spec(
                segments=[
                    segment(action_id="number-line-union", params=union_params([]))
                ]
            )
        )
        self.assertEqual(empty, [("segments[0].params.scopes", "OUT_OF_RANGE")])


if __name__ == "__main__":
    unittest.main()
