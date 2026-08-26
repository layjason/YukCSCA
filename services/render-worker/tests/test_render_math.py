"""Pure numeric helper tests for the CSCA Math render builders (no manim needed)."""

from __future__ import annotations

import unittest

from yukcsca_worker import render


class CurveSamplerTest(unittest.TestCase):
    def test_linear_sampling_matches_slope_intercept(self):
        coeffs = {"a": 2.0, "b": -1.0}
        self.assertEqual(render.evaluate_curve("LINEAR", coeffs, 3.0), 5.0)

    def test_quadratic_sinusoidal_and_power_values(self):
        self.assertEqual(
            render.evaluate_curve("QUADRATIC", {"a": 1, "b": 0, "c": -4}, 3.0), 5.0
        )
        self.assertAlmostEqual(
            render.evaluate_curve("SIN", {"a": 2, "b": 1, "c": 0, "d": 1}, 0.0), 1.0
        )
        self.assertEqual(render.evaluate_curve("POWER", {"a": 2, "n": 3}, 2.0), 16.0)

    def test_log_samples_positive_x_only(self):
        coeffs = {"a": 1.0, "base": 10.0}
        self.assertAlmostEqual(render.evaluate_curve("LOG", coeffs, 100.0), 2.0)
        self.assertIsNone(render.evaluate_curve("LOG", coeffs, 0.0))
        self.assertIsNone(render.evaluate_curve("LOG", coeffs, -5.0))

    def test_power_skips_fractional_exponent_on_negative_base(self):
        self.assertIsNone(render.evaluate_curve("POWER", {"a": 1, "n": 0.5}, -4.0))
        self.assertIsNotNone(render.evaluate_curve("POWER", {"a": 1, "n": 2}, -4.0))

    def test_sample_curve_runs_split_at_undefined_domain(self):
        runs = render.sample_curve_runs("LOG", {"a": 1.0, "base": 10.0}, -5.0, 5.0)
        self.assertTrue(runs)
        for run in runs:
            self.assertGreater(len(run), 1)
            self.assertTrue(all(x > 0 for x, _ in run))

    def test_find_key_points_roots_and_extrema(self):
        roots, extrema = render.find_key_points(
            "QUADRATIC", {"a": 1.0, "b": 0.0, "c": -4.0}, -5.0, 5.0
        )
        self.assertEqual(len(roots), 2)
        self.assertAlmostEqual(sorted(roots)[0], -2.0, places=4)
        self.assertAlmostEqual(sorted(roots)[1], 2.0, places=4)
        minima = extrema
        self.assertEqual(len(minima), 1)
        self.assertAlmostEqual(minima[0], 0.0, places=4)

        _, maxima = render.find_key_points(
            "QUADRATIC", {"a": -1.0, "b": 0.0, "c": 0.0}, -5.0, 5.0
        )
        self.assertEqual(len(maxima), 1)
        self.assertAlmostEqual(maxima[0], 0.0, places=4)

    def test_linear_root_on_grid_and_no_extrema(self):
        roots, extrema = render.find_key_points("LINEAR", {"a": 1.0, "b": 0.0}, -5.0, 5.0)
        self.assertEqual(len(roots), 1)
        self.assertAlmostEqual(roots[0], 0.0, places=6)
        self.assertEqual(extrema, [])


class IntervalLayoutTest(unittest.TestCase):
    def test_finite_interval_marks_both_ends_and_keeps_order_span(self):
        domain_lo, domain_hi, mark_left, mark_right = render.interval_layout(
            -2.0, 4.0, False, False
        )
        self.assertTrue(mark_left)
        self.assertTrue(mark_right)
        self.assertLess(domain_lo, -2.0)
        self.assertGreater(domain_hi, 4.0)

    def test_left_infinite_omits_left_number_and_extends_left_domain(self):
        domain_lo, domain_hi, mark_left, mark_right = render.interval_layout(
            -50.0, 3.0, True, False
        )
        self.assertFalse(mark_left)
        self.assertTrue(mark_right)
        self.assertLess(domain_lo, 3.0)
        self.assertGreater(domain_hi, 3.0)
        finite_only_lo, _, _, _ = render.interval_layout(3.0, 3.0, True, False)
        # Dummy left=-50 must not pull the finite closed end to the right edge.
        self.assertGreater(domain_lo, -50.0)
        self.assertAlmostEqual(finite_only_lo, domain_lo)

    def test_both_infinite_draws_no_numbered_ends(self):
        _, _, mark_left, mark_right = render.interval_layout(-1.0, 1.0, True, True)
        self.assertFalse(mark_left)
        self.assertFalse(mark_right)


class NumberFormattingTest(unittest.TestCase):
    def test_dot_decimal_never_comma(self):
        self.assertEqual(render.format_number(1234.5), "1234.5")
        self.assertNotIn(",", render.format_number(-98765.25))

    def test_integer_valued_floats_have_no_decimal_part(self):
        self.assertEqual(render.format_number(7.0), "7")
        self.assertEqual(render.format_number(-0.0), "0")

    def test_small_magnitudes_keep_dot_decimals(self):
        self.assertEqual(render.format_number(0.125), "0.125")

    def test_scientific_thresholds(self):
        self.assertIsNone(render.scientific_notation(0))
        self.assertIsNone(render.scientific_notation(9999.0))
        self.assertIsNone(render.scientific_notation(0.001))
        self.assertIsNotNone(render.scientific_notation(10000.0))
        self.assertIsNotNone(render.scientific_notation(0.0009))

    def test_scientific_components_stay_in_valid_range(self):
        mantissa, exponent = render.scientific_notation(250000.0)
        self.assertEqual(mantissa, "2.5")
        self.assertEqual(exponent, 5)

        mantissa, exponent = render.scientific_notation(1024000000000000000.0)
        self.assertEqual(mantissa, "1.024")
        self.assertEqual(exponent, 18)

    def test_sequence_term_uses_latex_scientific_on_overflow(self):
        self.assertEqual(render.sequence_term_latex(250.0), "250")
        latex = render.sequence_term_latex(250000.0)
        self.assertIn("\\times 10^{5}", latex)


class EquationBuilderTest(unittest.TestCase):
    def test_linear_with_signed_intercept(self):
        self.assertEqual(
            render.equation_latex("LINEAR", {"a": 2.0, "b": -1.0}), "y = 2x - 1"
        )

    def test_quadratic_full_form(self):
        self.assertEqual(
            render.equation_latex("QUADRATIC", {"a": 1.0, "b": -3.0, "c": 2.0}),
            "y = x^{2} - 3x + 2",
        )

    def test_quadratic_zero_terms_dropped(self):
        self.assertEqual(
            render.equation_latex("QUADRATIC", {"a": 1.0, "b": 0.0, "c": -4.0}),
            "y = x^{2} - 4",
        )

    def test_power_and_exponential_forms(self):
        self.assertEqual(
            render.equation_latex("POWER", {"a": 3.0, "n": 2.0}), "y = 3x^{2}"
        )
        self.assertEqual(
            render.equation_latex("EXP", {"a": 2.0, "r": 3.0}),
            "y = 2 \\cdot 3^{x}",
        )

    def test_log_shows_base(self):
        self.assertEqual(
            render.equation_latex("LOG", {"a": 1.0, "base": 2.0}),
            "y = \\log_{2}(x)",
        )

    def test_trig_full_form(self):
        self.assertEqual(
            render.equation_latex("SIN", {"a": 2.0, "b": 1.0, "c": 0.0, "d": -1.0}),
            "y = 2\\sin(x) - 1",
        )
        self.assertEqual(
            render.equation_latex("COS", {"a": -1.0, "b": 2.0, "c": 0.0, "d": 0.0}),
            "y = -\\cos(2x)",
        )

    def test_unknown_family_raises(self):
        with self.assertRaises(ValueError):
            render.equation_latex("TAN", {})


class IntervalNotationLatexTest(unittest.TestCase):
    def test_single_closed_interval(self):
        self.assertEqual(
            render.interval_notation_latex(
                [
                    {
                        "left": -2,
                        "leftBound": "OPEN",
                        "leftInf": "FINITE",
                        "right": 3,
                        "rightBound": "CLOSED",
                        "rightInf": "FINITE",
                    }
                ]
            ),
            "(-2,3]",
        )

    def test_union_joins_scopes_with_cup(self):
        scopes = [
            {
                "leftInf": "INFINITE",
                "right": 2,
                "rightBound": "CLOSED",
                "rightInf": "FINITE",
            },
            {
                "left": 5,
                "leftBound": "OPEN",
                "leftInf": "FINITE",
                "rightInf": "INFINITE",
            },
        ]
        self.assertEqual(
            render.interval_notation_parts(scopes),
            [r"(-\infty,2]", r"(5,\infty)"],
        )
        self.assertEqual(
            render.interval_notation_latex(scopes), r"(-\infty,2] \cup (5,\infty)"
        )

    def test_union_scope_colors_are_stable_and_distinct_for_four_scopes(self):
        colors = [render.union_scope_color(index) for index in range(4)]
        self.assertEqual(len(set(colors)), 4)
        self.assertEqual(render.union_scope_color(4), colors[0])

    def test_infinite_both_ends_open_brackets(self):
        self.assertEqual(
            render.interval_notation_latex(
                [{"leftInf": "INFINITE", "rightInf": "INFINITE"}]
            ),
            r"(-\infty,\infty)",
        )

    def test_endpoints_stay_dot_decimal(self):
        self.assertEqual(
            render.interval_notation_latex(
                [
                    {
                        "left": -0.25,
                        "leftBound": "CLOSED",
                        "leftInf": "FINITE",
                        "right": 1234.5,
                        "rightBound": "OPEN",
                        "rightInf": "FINITE",
                    }
                ]
            ),
            "[-0.25,1234.5)",
        )


class KeyPointModeTest(unittest.TestCase):
    """Regression for the product-owner defect: ROOTS must not show extrema."""

    COEFFS = {"a": 1.0, "b": 0.0, "c": -4.0}  # roots at ±2, one minimum at 0
    FAMILY = "QUADRATIC"

    def _found(self):
        found = render.find_key_points(self.FAMILY, self.COEFFS, -5.0, 5.0)
        self.assertEqual(len(found[0]), 2)
        self.assertEqual(len(found[1]), 1)
        return found

    def _rendered_counts(self, mode):
        """Dots+labels the board would draw: defined curve values only."""

        roots, extrema = render.select_key_points(mode, self._found())
        white = [
            (point, value)
            for point in roots
            if (value := render.evaluate_curve(self.FAMILY, self.COEFFS, point)) is not None
        ]
        amber = [
            (point, value)
            for point in extrema
            if (value := render.evaluate_curve(self.FAMILY, self.COEFFS, point)) is not None
        ]
        return white, amber

    def test_roots_mode_renders_exactly_two_dots_and_labels_no_extremum(self):
        white, amber = self._rendered_counts("ROOTS")
        self.assertEqual(len(white), 2)  # two white dots + two coordinate labels
        self.assertEqual(len(amber), 0)

    def test_extrema_mode_renders_one_amber_dot_and_label_only(self):
        white, amber = self._rendered_counts("EXTREMA")
        self.assertEqual(len(white), 0)
        self.assertEqual(len(amber), 1)
        self.assertAlmostEqual(amber[0][0], 0.0, places=4)

    def test_both_mode_keeps_roots_and_extrema(self):
        white, amber = self._rendered_counts("BOTH")
        self.assertEqual(len(white), 2)
        self.assertEqual(len(amber), 1)

    def test_none_and_unknown_modes_keep_neither_kind(self):
        self.assertEqual(render.select_key_points("NONE", ([1.0], [2.0])), ([], []))
        self.assertEqual(render.select_key_points("SURPRISE", ([1.0], [2.0])), ([], []))


class PointCoordinateLabelTest(unittest.TestCase):
    def test_coordinate_labels_are_parenthesized_dot_decimal(self):
        self.assertEqual(render.point_coordinate_latex(1.0, 0.0), "(1,0)")
        self.assertEqual(render.point_coordinate_latex(1.5, -0.25), "(1.5,-0.25)")

    def test_label_has_exactly_two_comma_separated_numbers(self):
        parts = render.point_coordinate_latex(-98765.25, 0.5).split(",")
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0], "(-98765.25")
        self.assertEqual(parts[1], "0.5)")


class TickDecimalPlacesTest(unittest.TestCase):
    def test_integral_steps_show_zero_places(self):
        for step in (1.0, 2.0, 40.0, 5, 10.0):
            self.assertEqual(render.tick_decimal_places(step), 0)

    def test_fractional_steps_keep_smallest_exact_places(self):
        self.assertEqual(render.tick_decimal_places(0.2), 1)
        self.assertEqual(render.tick_decimal_places(0.5), 1)
        self.assertEqual(render.tick_decimal_places(2.5), 1)
        self.assertEqual(render.tick_decimal_places(0.25), 2)
        self.assertEqual(render.tick_decimal_places(0.125), 3)

    def test_non_representable_steps_cap_at_six(self):
        self.assertEqual(render.tick_decimal_places(1 / 3), 6)

    def test_zero_and_negative_steps_are_safe(self):
        self.assertEqual(render.tick_decimal_places(0.0), 0)
        self.assertEqual(render.tick_decimal_places(-0.5), 1)


if __name__ == "__main__":
    unittest.main()
