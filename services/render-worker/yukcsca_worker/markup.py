"""Markup helpers for reviewed scene text.

STRING and MULTILINE_TEXT use the same ``\\(...\\)`` convention as lesson TEXT
(VS-010A). Safety matches Java ``InlineLatex``: block file/HTML primitives and
raw ``<`` / ``>`` (prefer ``\\lt`` / ``\\gt``). The worker never executes
authored scene code.
"""

from __future__ import annotations

import re
from typing import Iterable

OPEN = "\\("
CLOSE = "\\)"
MAX_FRAGMENT_LENGTH = 4000
MAX_FRAGMENTS = 64
CJK_RE = re.compile(r"[\u3400-\u9fff]")
UNSAFE_COMMANDS = (
    "\\html",
    "\\href",
    "\\url",
    "\\includegraphics",
    "\\def",
    "\\gdef",
    "\\newcommand",
    "\\renewcommand",
    "\\providecommand",
    "\\let",
    "\\input",
    "\\include",
    "\\special",
)
# Control-word boundary is after the name only. A lookbehind on the preceding
# character would skip ``x\lt 2`` because ``x`` is a letter.
_LT = re.compile(r"\\lt(?![A-Za-z])")
_GT = re.compile(r"\\gt(?![A-Za-z])")


def parse_inline_latex(source: str) -> list[tuple[str, str]]:
    """Splits into ``('text', ...)``, ``('math', ...)``, or ``('unmatched', ...)``."""

    if not source:
        return []
    segments: list[tuple[str, str]] = []
    index = 0
    while index < len(source):
        open_at = source.find(OPEN, index)
        if open_at < 0:
            segments.append(("text", source[index:]))
            break
        if open_at > index:
            segments.append(("text", source[index:open_at]))
        close_at = source.find(CLOSE, open_at + len(OPEN))
        if close_at < 0:
            segments.append(("unmatched", source[open_at:]))
            break
        segments.append(("math", source[open_at + len(OPEN) : close_at]))
        index = close_at + len(CLOSE)
    return segments


def iter_inline_math(text: str) -> Iterable[str]:
    for kind, content in parse_inline_latex(text or ""):
        if kind == "math" and content.strip():
            yield content.strip()


def is_safe_latex(latex: str | None) -> bool:
    if latex is None or not latex.strip():
        return False
    if len(latex) > MAX_FRAGMENT_LENGTH:
        return False
    lowered = latex.lower()
    if "<" in lowered or ">" in lowered:
        return False
    if "^^" in latex:
        return False
    return not any(command in lowered for command in UNSAFE_COMMANDS)


def is_valid_mixed(source: str | None) -> bool:
    if source is None:
        return True
    math_count = 0
    for kind, content in parse_inline_latex(source):
        if kind == "unmatched":
            return False
        if kind == "math":
            math_count += 1
            if math_count > MAX_FRAGMENTS or not is_safe_latex(content):
                return False
    return True


def tex_for_manim(tex: str) -> str:
    """KaTeX ``\\lt`` / ``\\gt`` are not TeX primitives; MathTex needs ``<`` / ``>``."""

    return _GT.sub(">", _LT.sub("<", tex))


LATIN_PUNCTUATION = frozenset(",.;:!?")
CJK_PUNCTUATION = frozenset("。，、；：！？")
_TRAILING_PUNCT = LATIN_PUNCTUATION | CJK_PUNCTUATION
_LEADING_PUNCT_RE = re.compile(
    r"^([" + re.escape("".join(sorted(_TRAILING_PUNCT))) + r"]+)(\s*)(.*)$",
    re.DOTALL,
)


def split_markup(text: str) -> list[tuple[str, str]]:
    """Splits mixed prose into ``('text', ...)`` and ``('tex', ...)`` runs."""

    runs: list[tuple[str, str]] = []
    for kind, content in parse_inline_latex(text or ""):
        if kind == "math":
            if content.strip():
                runs.append(("tex", content.strip()))
        elif kind == "text" and content:
            runs.append(("text", content))
        elif kind == "unmatched" and content:
            runs.append(("text", content))
    return runs


def attach_trailing_punctuation(runs: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Keeps sentence punctuation with the preceding inline TeX atom.

    Lesson TEXT / MATH *blocks* stay independent (VS-011 chunking and Ask quote
    snap). This only glues ``.\\),``-style punctuation around inline ``\\(...\\)``
    so a period is not laid out as its own glyph.
    """

    attached: list[tuple[str, str]] = []
    for kind, content in runs:
        if kind == "text" and attached and attached[-1][0] == "tex":
            match = _LEADING_PUNCT_RE.match(content)
            if match:
                punct, space, rest = match.group(1), match.group(2), match.group(3)
                attached.append(("punct", punct))
                remainder = f"{space}{rest}"
                if remainder:
                    attached.append(("text", remainder))
                continue
        attached.append((kind, content))
    return attached


def needs_word_space(left: tuple[str, str], right: tuple[str, str]) -> bool:
    """True when composed runs should keep a word space between them.

    Manim ``Text`` drops leading/trailing ASCII spaces, so spacing has to be
    applied as a gap. Punctuation glued to TeX stays tight.
    """

    left_kind, left_content = left
    right_kind, right_content = right
    if left_kind == "tex" and right_kind == "punct":
        return False
    if left_kind == "punct" and right_kind == "tex":
        return False
    if left_kind == "text" and left_content[-1:].isspace():
        return True
    if right_kind == "text" and right_content[:1].isspace():
        return True
    if left_kind == "punct" and right_kind == "text" and right_content[:1].isspace():
        return True
    return False


def fold_latin_punctuation(line: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Folds Latin sentence punctuation into the previous TeX atom as ``\\text``.

    CJK punctuation stays a separate run: pdflatex ``\\text`` cannot host CJK.
    """

    folded: list[tuple[str, str]] = []
    for kind, content in line:
        if (
            kind == "punct"
            and folded
            and folded[-1][0] == "tex"
            and content
            and all(char in LATIN_PUNCTUATION for char in content)
        ):
            folded[-1] = ("tex", folded[-1][1] + rf"\text{{{content}}}")
            continue
        folded.append((kind, content))
    return folded


def wrap_markup_lines(text: str, width: int = 42) -> list[list[tuple[str, str]]]:
    """Wraps mixed markup into visual lines without breaking a TeX atom."""

    lines: list[list[tuple[str, str]]] = []
    paragraphs = str(text or "").splitlines() or [""]
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        current: list[tuple[str, str]] = []
        length = 0
        for kind, content in attach_trailing_punctuation(split_markup(paragraph)):
            if kind == "tex":
                piece_len = min(width, max(1, len(content)))
                if current and length + piece_len > width:
                    lines.append(current)
                    current, length = [], 0
                current.append((kind, content))
                length += piece_len
                continue
            if kind == "punct":
                if current:
                    current.append((kind, content))
                    length += len(content)
                else:
                    current.append(("text", content))
                    length += len(content)
                continue
            for token in _text_tokens(content):
                token_len = len(token)
                if current and length + token_len > width:
                    lines.append(current)
                    current, length = [], 0
                if not current:
                    token = token.lstrip()
                    token_len = len(token)
                    if not token:
                        continue
                current.append(("text", token))
                length += token_len
        if current:
            lines.append(current)
    return lines or [[("text", (text or " ").strip() or " ")]]


def _text_tokens(content: str) -> list[str]:
    if CJK_RE.search(content):
        return list(content)
    return re.findall(r"\s+|\S+", content)
