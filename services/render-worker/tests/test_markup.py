"""Markup split/wrap tests (stdlib only)."""

from __future__ import annotations

import unittest

from yukcsca_worker import markup, registry


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


class MarkupSplitTest(unittest.TestCase):
    def test_splits_lesson_inline_delimiters(self):
        runs = markup.split_markup(r"Area is \( \frac{1}{2} \) or \(x^2\).")
        self.assertEqual(
            runs,
            [
                ("text", "Area is "),
                ("tex", r"\frac{1}{2}"),
                ("text", " or "),
                ("tex", "x^2"),
                ("text", "."),
            ],
        )

    def test_wrap_keeps_tex_atoms_intact(self):
        lines = markup.wrap_markup_lines(
            r"The formula \(x=\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}\) is exact.",
            width=18,
        )
        tex_runs = [run for line in lines for run in line if run[0] == "tex"]
        self.assertEqual(tex_runs, [("tex", r"x=\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}")])

    def test_cjk_wraps_by_character(self):
        lines = markup.wrap_markup_lines("二次方程式的解", width=4)
        self.assertGreaterEqual(len(lines), 2)

    def test_plain_phrase_stays_on_one_line(self):
        lines = markup.wrap_markup_lines("Quadratic formula", width=42)
        self.assertEqual(len(lines), 1)
        joined = "".join(content for _kind, content in lines[0])
        self.assertEqual(joined.strip(), "Quadratic formula")


class InlineMarkupValidationTest(unittest.TestCase):
    def test_title_allows_reviewed_inline_tex(self):
        self.assertEqual(
            registry.validate_specification(
                spec(
                    segments=[
                        segment(
                            params={"text": r"The formula \(x=\frac{-b}{2a}\)"}
                        )
                    ]
                )
            ),
            [],
        )

    def test_title_rejects_unsafe_inline_tex(self):
        violations = registry.validate_specification(
            spec(segments=[segment(params={"text": r"Read \(\input{/etc/passwd}\)"})])
        )
        self.assertIn(("segments[0].params.text", "INVALID"), violations)

    def test_expression_accepts_lt_like_lesson_math(self):
        self.assertEqual(
            registry.validate_specification(
                spec(
                    segments=[
                        segment(
                            action_id="worked-example-step",
                            params={
                                "stepLabel": "Quadratic inequality",
                                "expression": r"x^{2}-5x+6=(x-2)(x-3)\lt 0",
                            },
                            narration="Factor and test signs.",
                        )
                    ]
                )
            ),
            [],
        )

    def test_expression_rejects_raw_angle_brackets(self):
        violations = registry.validate_specification(
            spec(
                segments=[
                    segment(
                        action_id="worked-example-step",
                        params={
                            "stepLabel": "Quadratic inequality",
                            "expression": "x^{2}-5x+6=(x-2)(x-3)<0",
                        },
                    )
                ]
            )
        )
        self.assertIn(("segments[0].params.expression", "INVALID"), violations)

    def test_tex_for_manim_maps_katex_inequalities(self):
        self.assertEqual(markup.tex_for_manim(r"a \lt b \gt c"), "a < b > c")


if __name__ == "__main__":
    unittest.main()
