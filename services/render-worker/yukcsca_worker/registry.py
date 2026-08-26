"""Reviewed render-template registry (VS-010B).

Data-only mirror of the Java ``SceneTemplateRegistry``. The version and action set
must stay identical on both sides: Java validates at compile time, the worker
re-validates before rendering, and ``scene_template_registry_version`` records the
append-only history. No template content is executable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Optional

from .markup import is_safe_latex, is_valid_mixed

VERSION = "2026-08.4"

STRING = "STRING"
MULTILINE_TEXT = "MULTILINE_TEXT"
INTEGER = "INTEGER"
DECIMAL = "DECIMAL"
MATH_EXPRESSION = "MATH_EXPRESSION"
ENUM = "ENUM"
INTERVAL_SET = "INTERVAL_SET"
TEXT_KINDS = (STRING, MULTILINE_TEXT, MATH_EXPRESSION)
NUMBER_KINDS = (INTEGER, DECIMAL)

MAX_SEGMENTS = 60
MAX_NARRATION_LENGTH = 600
MAX_PARAM_KEYS = 16
MAX_INTERVAL_SCOPES = 4
EXPLANATION_LANGUAGES = ("id", "en", "zh-CN")
ACTION_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

INTERVAL_END_TOKENS = ("FINITE", "INFINITE")
INTERVAL_BOUND_TOKENS = ("OPEN", "CLOSED")
INTERVAL_KNOWN_FIELDS = frozenset(
    {"left", "leftBound", "leftInf", "right", "rightBound", "rightInf"}
)
INTERVAL_ENDPOINT_LIMIT = 100.0

# Family-conditional coefficient requirements (D-06); mirrors the Java
# SceneSpecificationValidator exactly so both sides report identical violations.
# Coefficient ``a`` is required for every family, so its descriptor flag enforces it;
# this table only lists coefficients whose requirement depends on the chosen family.
REQUIRED_COEFFICIENTS: dict[str, tuple[str, ...]] = {
    "LINEAR": ("b",),
    "QUADRATIC": ("b", "c"),
    "POWER": ("n",),
    "EXP": ("r",),
    "LOG": ("base",),
    "SIN": ("b", "c", "d"),
    "COS": ("b", "c", "d"),
}


@dataclass(frozen=True)
class ParamDescriptor:
    id: str
    kind: str
    label: Optional[str]
    required: bool
    min: Optional[float]
    max: Optional[float]
    max_length: Optional[int]
    choices: Optional[tuple[str, ...]] = None


@dataclass(frozen=True)
class TemplateAction:
    id: str
    display_name: str
    params: tuple[ParamDescriptor, ...]


def _p(
    pid: str,
    kind: str,
    label: str,
    required: bool = True,
    minimum: Optional[float] = None,
    maximum: Optional[float] = None,
    max_length: Optional[int] = None,
    choices: Optional[tuple[str, ...]] = None,
) -> ParamDescriptor:
    return ParamDescriptor(pid, kind, label, required, minimum, maximum, max_length, choices)


ACTIONS: tuple[TemplateAction, ...] = (
    TemplateAction(
        "title-heading",
        "Title heading",
        (_p("text", STRING, "Heading text", max_length=120),),
    ),
    TemplateAction(
        "concept-definition",
        "Concept definition",
        (
            _p("term", STRING, "Term", max_length=80),
            _p("definition", MULTILINE_TEXT, "Definition", max_length=400),
        ),
    ),
    TemplateAction(
        "statement-text",
        "Statement text",
        (_p("text", MULTILINE_TEXT, "Statement", max_length=300),),
    ),
    TemplateAction(
        "worked-example-step",
        "Worked example step",
        (
            _p("stepLabel", STRING, "Step label", max_length=40),
            _p("expression", MATH_EXPRESSION, "Step expression", max_length=400),
        ),
    ),
    TemplateAction(
        "highlight-box",
        "Highlighted key point",
        (_p("text", MULTILINE_TEXT, "Key point", max_length=300),),
    ),
    TemplateAction(
        "function-graph",
        "Function graph",
        (
            _p(
                "family",
                ENUM,
                "Curve family",
                choices=("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS"),
            ),
            _p("a", DECIMAL, "Coefficient a"),
            _p("b", DECIMAL, "Coefficient b", required=False),
            _p("c", DECIMAL, "Coefficient c", required=False),
            _p("d", DECIMAL, "Coefficient d", required=False),
            _p("n", DECIMAL, "Exponent n", required=False),
            _p("r", DECIMAL, "Ratio r", required=False),
            _p("base", DECIMAL, "Logarithm base", required=False),
            _p("xMin", DECIMAL, "X axis minimum", minimum=-100.0, maximum=100.0),
            _p("xMax", DECIMAL, "X axis maximum", minimum=-100.0, maximum=100.0),
            _p(
                "yMin",
                DECIMAL,
                "Y axis minimum",
                required=False,
                minimum=-100.0,
                maximum=100.0,
            ),
            _p(
                "yMax",
                DECIMAL,
                "Y axis maximum",
                required=False,
                minimum=-100.0,
                maximum=100.0,
            ),
            _p("keyPoints", ENUM, "Key points", choices=("NONE", "ROOTS", "EXTREMA", "BOTH")),
            _p("caption", MATH_EXPRESSION, "Caption", required=False, max_length=120),
        ),
    ),
    TemplateAction(
        "number-line-interval",
        "Number line interval",
        (
            _p("leftInf", ENUM, "Left end type", choices=("FINITE", "INFINITE")),
            _p(
                "left",
                DECIMAL,
                "Left endpoint",
                required=False,
                minimum=-100.0,
                maximum=100.0,
            ),
            _p(
                "leftBound",
                ENUM,
                "Left bound type",
                required=False,
                choices=("OPEN", "CLOSED"),
            ),
            _p("rightInf", ENUM, "Right end type", choices=("FINITE", "INFINITE")),
            _p(
                "right",
                DECIMAL,
                "Right endpoint",
                required=False,
                minimum=-100.0,
                maximum=100.0,
            ),
            _p(
                "rightBound",
                ENUM,
                "Right bound type",
                required=False,
                choices=("OPEN", "CLOSED"),
            ),
            _p("setLabel", MATH_EXPRESSION, "Set label", required=False, max_length=80),
        ),
    ),
    TemplateAction(
        "number-line-union",
        "Number line union",
        (
            _p("scopes", INTERVAL_SET, "Interval scopes"),
            _p("setLabel", MATH_EXPRESSION, "Set label", required=False, max_length=80),
        ),
    ),
)

_ACTIONS_BY_ID = {action.id: action for action in ACTIONS}


def action(action_id: str) -> Optional[TemplateAction]:
    return _ACTIONS_BY_ID.get(action_id)


def violation(path: str, code: str) -> tuple[str, str]:
    return (path, code)


def validate_specification(spec: dict[str, Any]) -> list[tuple[str, str]]:
    """Validates a scene-specification snapshot; returns (path, code) violations.

    Path grammar mirrors the Java validator exactly: ``segments[i]``,
    ``segments[i].templateActionId``, ``segments[i].params.<paramId>``,
    ``segments[i].narrationText``, plus collection-level ``segments`` and
    ``explanationLanguage``. INTERVAL_SET parameters (``number-line-union``)
    extend the param grammar with composite item paths
    ``segments[i].params.<paramId>[j]`` and sub-field paths
    ``segments[i].params.<paramId>[j].<field>``.
    """

    violations: list[tuple[str, str]] = []
    language = spec.get("explanationLanguage")
    if language not in EXPLANATION_LANGUAGES:
        violations.append(violation("explanationLanguage", "UNSUPPORTED"))
    segments = spec.get("segments")
    if not isinstance(segments, list) or not 1 <= len(segments) <= MAX_SEGMENTS:
        violations.append(violation("segments", "OUT_OF_RANGE"))
        return violations
    for index, segment in enumerate(segments):
        base = f"segments[{index}]"
        if not isinstance(segment, dict):
            violations.append(violation(base, "INVALID"))
            continue
        action_id = segment.get("templateActionId")
        template = None
        if not isinstance(action_id, str) or not action_id.strip():
            violations.append(violation(f"{base}.templateActionId", "REQUIRED"))
        elif not ACTION_ID_PATTERN.match(action_id):
            violations.append(violation(f"{base}.templateActionId", "INVALID"))
        else:
            template = action(action_id)
            if template is None:
                violations.append(violation(f"{base}.templateActionId", "UNSUPPORTED"))
        narration = segment.get("narrationText")
        if not isinstance(narration, str) or not narration.strip():
            violations.append(violation(f"{base}.narrationText", "REQUIRED"))
        elif len(narration) > MAX_NARRATION_LENGTH:
            violations.append(violation(f"{base}.narrationText", "OUT_OF_RANGE"))
        violations.extend(
            _validate_params(segment.get("params"), template, base)
        )
    return violations


def _validate_params(
    params: Any, template: Optional[TemplateAction], base: str
) -> Iterable[tuple[str, str]]:
    if template is None:
        return []
    params_path = f"{base}.params"
    if params is None:
        if any(descriptor.required for descriptor in template.params):
            yield violation(params_path, "REQUIRED")
        return
    if not isinstance(params, dict):
        yield violation(params_path, "INVALID")
        return
    if len(params) > MAX_PARAM_KEYS:
        yield violation(params_path, "OUT_OF_RANGE")
    known = {descriptor.id for descriptor in template.params}
    for key in params:
        if key not in known:
            yield violation(f"{params_path}.{key}", "UNSUPPORTED")
    for descriptor in template.params:
        path = f"{params_path}.{descriptor.id}"
        value = params.get(descriptor.id)
        if value is None:
            if descriptor.required:
                yield violation(path, "REQUIRED")
            continue
        if descriptor.kind in TEXT_KINDS:
            if not isinstance(value, str) or not value.strip():
                yield violation(path, "INVALID")
            elif descriptor.max_length is not None and len(value) > descriptor.max_length:
                yield violation(path, "OUT_OF_RANGE")
            elif descriptor.kind == MATH_EXPRESSION and not is_safe_latex(value):
                yield violation(path, "INVALID")
            elif descriptor.kind != MATH_EXPRESSION and not is_valid_mixed(value):
                yield violation(path, "INVALID")
        elif descriptor.kind in NUMBER_KINDS:
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                yield violation(path, "INVALID")
            elif descriptor.kind == INTEGER and not float(value).is_integer():
                yield violation(path, "INVALID")
            else:
                numeric = float(value)
                if (descriptor.min is not None and numeric < descriptor.min) or (
                    descriptor.max is not None and numeric > descriptor.max
                ):
                    yield violation(path, "OUT_OF_RANGE")
        elif descriptor.kind == ENUM:
            choices = descriptor.choices or ()
            if not isinstance(value, str) or value not in choices:
                yield violation(path, "INVALID")
        elif descriptor.kind == INTERVAL_SET:
            yield from _validate_interval_scopes(value, path)
    yield from _action_semantics(template.id, params, params_path)


def _validate_interval_scopes(
    scopes: Any, base_path: str
) -> Iterable[tuple[str, str]]:
    """Validates one INTERVAL_SET value; byte-parity with the Java kind case.

    The composite must be a JSON array of 1..MAX_INTERVAL_SCOPES scope objects.
    Field order inside each scope (unknown fields, then leftInf, rightInf,
    left+leftBound, right+rightBound) is part of the violation contract.
    """

    if not isinstance(scopes, list):
        yield violation(base_path, "INVALID")
        return
    if not 1 <= len(scopes) <= MAX_INTERVAL_SCOPES:
        yield violation(base_path, "OUT_OF_RANGE")
    for index, scope in enumerate(scopes):
        yield from _validate_interval_scope(scope, f"{base_path}[{index}]")


def _validate_interval_scope(
    scope: Any, base_path: str
) -> Iterable[tuple[str, str]]:
    """Validates one interval scope object at ``base_path``."""

    if not isinstance(scope, dict):
        yield violation(base_path, "INVALID")
        return
    for field in scope:
        if field not in INTERVAL_KNOWN_FIELDS:
            yield violation(f"{base_path}.{field}", "UNSUPPORTED")
    left_inf = _interval_end_token(scope, "leftInf", base_path)
    right_inf = _interval_end_token(scope, "rightInf", base_path)
    yield from _validate_interval_end(scope, "left", "leftBound", left_inf, base_path)
    yield from _validate_interval_end(scope, "right", "rightBound", right_inf, base_path)


def _interval_end_token(
    scope: dict[str, Any], field_id: str, base_path: str
) -> tuple[Optional[str], list[tuple[str, str]]]:
    """Returns (token, violations) for one FINITE/INFINITE end; token is None when bad."""

    token = scope.get(field_id)
    if token is None:
        return None, [violation(f"{base_path}.{field_id}", "REQUIRED")]
    if not isinstance(token, str) or token not in INTERVAL_END_TOKENS:
        return None, [violation(f"{base_path}.{field_id}", "INVALID")]
    return token, []


def _validate_interval_end(
    scope: dict[str, Any],
    number_field: str,
    bound_field: str,
    end_token: tuple[Optional[str], list[tuple[str, str]]],
    base_path: str,
) -> Iterable[tuple[str, str]]:
    """Endpoint number and bound type of one FINITE end; INFINITE ends are skipped.

    Fields on an INFINITE end are semantically absent: neither required nor
    validated (same D-08/D-10 posture as the single-interval action).
    """

    _, token_violations = end_token
    yield from token_violations
    if end_token[0] != "FINITE":
        return
    number = scope.get(number_field)
    if number is None:
        yield violation(f"{base_path}.{number_field}", "REQUIRED")
    elif isinstance(number, bool) or not isinstance(number, (int, float)):
        yield violation(f"{base_path}.{number_field}", "INVALID")
    elif not -INTERVAL_ENDPOINT_LIMIT <= float(number) <= INTERVAL_ENDPOINT_LIMIT:
        yield violation(f"{base_path}.{number_field}", "OUT_OF_RANGE")
    bound = scope.get(bound_field)
    if bound is None:
        yield violation(f"{base_path}.{bound_field}", "REQUIRED")
    elif not isinstance(bound, str) or bound not in INTERVAL_BOUND_TOKENS:
        yield violation(f"{base_path}.{bound_field}", "INVALID")


def _numeric(params: dict[str, Any], key: str) -> Optional[float]:
    """Returns the numeric value only when well-formed; bool/str never drive semantics."""
    value = params.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _token(params: dict[str, Any], key: str) -> Optional[str]:
    value = params.get(key)
    return value if isinstance(value, str) else None


def _action_semantics(
    action_id: str, params: dict[str, Any], params_path: str
) -> list[tuple[str, str]]:
    """Conditional CSCA Math rules (D-06..D-09), byte-parity with the Java validator.

    Runs only on already well-formed inputs: a parameter that failed its own
    descriptor check is skipped here so no duplicate violation is reported.
    """

    if not isinstance(params, dict):
        return []
    violations: list[tuple[str, str]] = []
    if action_id == "function-graph":
        family = _token(params, "family")
        if family in REQUIRED_COEFFICIENTS:
            for coefficient_id in REQUIRED_COEFFICIENTS[family]:
                if params.get(coefficient_id) is None:
                    violations.append(
                        violation(f"{params_path}.{coefficient_id}", "REQUIRED")
                    )
            if family == "EXP":
                ratio = _numeric(params, "r")
                if ratio is not None and (ratio <= 0 or ratio == 1):
                    violations.append(violation(f"{params_path}.r", "OUT_OF_RANGE"))
            elif family == "LOG":
                base = _numeric(params, "base")
                if base is not None and (base <= 0 or base == 1):
                    violations.append(violation(f"{params_path}.base", "OUT_OF_RANGE"))
        x_min = _numeric(params, "xMin")
        x_max = _numeric(params, "xMax")
        if x_min is not None and x_max is not None and x_min >= x_max:
            violations.append(violation(f"{params_path}.xMax", "INVALID"))
    elif action_id == "number-line-interval":
        left_inf = _token(params, "leftInf")
        right_inf = _token(params, "rightInf")
        left = _numeric(params, "left")
        right = _numeric(params, "right")
        # D-08/D-12: endpoint and bound type are meaningless on an infinite end, so each is
        # required only when that end is FINITE (same conditional pattern as family coefficients).
        # Presence is checked on the raw value so one that already failed its descriptor check is
        # not double-reported.
        if left_inf == "FINITE" and params.get("left") is None:
            violations.append(violation(f"{params_path}.left", "REQUIRED"))
        if left_inf == "FINITE" and params.get("leftBound") is None:
            violations.append(violation(f"{params_path}.leftBound", "REQUIRED"))
        if right_inf == "FINITE" and params.get("right") is None:
            violations.append(violation(f"{params_path}.right", "REQUIRED"))
        if right_inf == "FINITE" and params.get("rightBound") is None:
            violations.append(violation(f"{params_path}.rightBound", "REQUIRED"))
        if (
            left_inf == "FINITE"
            and right_inf == "FINITE"
            and left is not None
            and right is not None
            and left >= right
        ):
            violations.append(violation(f"{params_path}.right", "INVALID"))
    elif action_id == "number-line-union":
        scopes = params.get("scopes")
        if isinstance(scopes, list):
            for index, scope in enumerate(scopes):
                if not isinstance(scope, dict):
                    continue
                left = _numeric(scope, "left")
                right = _numeric(scope, "right")
                left_finite = _token(scope, "leftInf") == "FINITE"
                right_finite = _token(scope, "rightInf") == "FINITE"
                if (
                    left_finite
                    and right_finite
                    and left is not None
                    and right is not None
                    and left >= right
                ):
                    violations.append(
                        violation(f"{params_path}.scopes[{index}].right", "INVALID")
                    )
    return violations

