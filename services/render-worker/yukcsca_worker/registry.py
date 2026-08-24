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

VERSION = "2026-08.1"

STRING = "STRING"
MULTILINE_TEXT = "MULTILINE_TEXT"
INTEGER = "INTEGER"
DECIMAL = "DECIMAL"
MATH_EXPRESSION = "MATH_EXPRESSION"
TEXT_KINDS = (STRING, MULTILINE_TEXT, MATH_EXPRESSION)
NUMBER_KINDS = (INTEGER, DECIMAL)

MAX_SEGMENTS = 60
MAX_NARRATION_LENGTH = 600
MAX_PARAM_KEYS = 16
EXPLANATION_LANGUAGES = ("id", "en", "zh-CN")
ACTION_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


@dataclass(frozen=True)
class ParamDescriptor:
    id: str
    kind: str
    label: Optional[str]
    required: bool
    min: Optional[float]
    max: Optional[float]
    max_length: Optional[int]


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
) -> ParamDescriptor:
    return ParamDescriptor(pid, kind, label, required, minimum, maximum, max_length)


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
    ``explanationLanguage``.
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

