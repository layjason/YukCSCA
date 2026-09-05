import { expect, test } from 'vitest';
import {
  containsInlineLatex,
  isSafeLatex,
  isValidMixedLatex,
  mixedLatexHasAngleBrackets,
  parseInlineLatex,
  rangesOverlap,
  reservedInlineLatexRanges,
} from './inlineLatex';

test('plain prose stays a single text segment', () => {
  expect(parseInlineLatex('若函数单调递增')).toEqual([
    { kind: 'text', text: '若函数单调递增', start: 0, end: 7 },
  ]);
  expect(containsInlineLatex('若函数单调递增')).toBe(false);
});

test('parses multiple inline fragments and keeps UTF-16 offsets including delimiters', () => {
  const source = "若函数 \\(f(x)\\) 则 \\(f'(x)\\gt 0\\)。";
  const segments = parseInlineLatex(source);
  expect(segments.map((segment) => segment.kind)).toEqual(['text', 'math', 'text', 'math', 'text']);
  const firstMath = segments[1];
  expect(firstMath).toMatchObject({ kind: 'math', latex: 'f(x)' });
  expect(source.slice(firstMath!.start, firstMath!.end)).toBe('\\(f(x)\\)');
  expect(reservedInlineLatexRanges(source)).toEqual([
    { start: firstMath!.start, end: firstMath!.end },
    { start: segments[3]!.start, end: segments[3]!.end },
  ]);
});

test('inner parentheses are not closers', () => {
  const source = '区间 \\((0,+\\infty)\\) 上';
  const math = parseInlineLatex(source).find((segment) => segment.kind === 'math');
  expect(math).toMatchObject({ kind: 'math', latex: '(0,+\\infty)' });
});

test('parses single-dollar math including numeric set members', () => {
  const source = 'Use $A \\cap B$, then keep $2$ and $4$ once.';
  expect(parseInlineLatex(source).filter((segment) => segment.kind === 'math')).toEqual([
    { kind: 'math', latex: 'A \\cap B', start: 4, end: 14 },
    { kind: 'math', latex: '2', start: 26, end: 29 },
    { kind: 'math', latex: '4', start: 34, end: 37 },
  ]);
});

test('leaves an unmatched currency dollar as prose', () => {
  expect(parseInlineLatex('Cost is $5 today.')).toEqual([
    { kind: 'text', text: 'Cost is $5 today.', start: 0, end: 17 },
  ]);
  expect(parseInlineLatex('Budget is $5 today and $10 tomorrow.')).toEqual([
    { kind: 'text', text: 'Budget is $5 today and $10 tomorrow.', start: 0, end: 36 },
  ]);
});

test('accepts whitespace around a delimited formula but not currency prose', () => {
  expect(parseInlineLatex('解集是 $ (2,3) $。')).toEqual([
    { kind: 'text', text: '解集是 ', start: 0, end: 4 },
    { kind: 'math', latex: '(2,3)', start: 4, end: 13 },
    { kind: 'text', text: '。', start: 13, end: 14 },
  ]);
  expect(parseInlineLatex('Budget is $ 5 today and $ 10 tomorrow.')).toEqual([
    { kind: 'text', text: 'Budget is $ 5 today and $ 10 tomorrow.', start: 0, end: 38 },
  ]);
});

test('parses fully LaTeX forms without delimiters', () => {
  expect(parseInlineLatex('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}')).toEqual([
    { kind: 'math', latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', start: 0, end: 32 },
  ]);
  expect(parseInlineLatex('x^2 - 5x + 6 = 0')).toEqual([
    { kind: 'math', latex: 'x^2 - 5x + 6 = 0', start: 0, end: 16 },
  ]);
});

test('parses quoted fully LaTeX form in working trace labels', () => {
  const traceZh = '检索了本套件：“\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}”';
  expect(parseInlineLatex(traceZh)).toEqual([
    { kind: 'text', text: '检索了本套件：“', start: 0, end: 8 },
    { kind: 'math', latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', start: 8, end: 40 },
    { kind: 'text', text: '”', start: 40, end: 41 },
  ]);

  const traceEn = 'Searched this package for “x^2 - 5x + 6 = 0”';
  expect(parseInlineLatex(traceEn)).toEqual([
    { kind: 'text', text: 'Searched this package for “', start: 0, end: 27 },
    { kind: 'math', latex: 'x^2 - 5x + 6 = 0', start: 27, end: 43 },
    { kind: 'text', text: '”', start: 43, end: 44 },
  ]);

  const standaloneQuoted = '“\\frac{1}{2}”';
  expect(parseInlineLatex(standaloneQuoted)).toEqual([
    { kind: 'text', text: '“', start: 0, end: 1 },
    { kind: 'math', latex: '\\frac{1}{2}', start: 1, end: 12 },
    { kind: 'text', text: '”', start: 12, end: 13 },
  ]);
});

test('does not classify ordinary prose equations as pure LaTeX', () => {
  expect(parseInlineLatex('Version 2 = Beta')).toEqual([
    { kind: 'text', text: 'Version 2 = Beta', start: 0, end: 16 },
  ]);
});

test('parses display bracket and double-dollar math', () => {
  expect(parseInlineLatex('\\[\\frac{a}{b}\\]')).toEqual([
    { kind: 'math', latex: '\\frac{a}{b}', start: 0, end: 15 },
  ]);
  expect(parseInlineLatex('Formula $$\\sum_{i=1}^n i$$ applies')).toEqual([
    { kind: 'text', text: 'Formula ', start: 0, end: 8 },
    { kind: 'math', latex: '\\sum_{i=1}^n i', start: 8, end: 26 },
    { kind: 'text', text: ' applies', start: 26, end: 34 },
  ]);
});

test('unmatched opener consumes the remainder', () => {
  const source = '若 \\(f(x) 单调递增';
  expect(parseInlineLatex(source)).toEqual([
    { kind: 'text', text: '若 ', start: 0, end: 2 },
    { kind: 'unmatched', text: '\\(f(x) 单调递增', start: 2, end: source.length },
  ]);
  expect(containsInlineLatex(source)).toBe(true);
});

test('range overlap is half-open', () => {
  expect(rangesOverlap(0, 2, 2, 4)).toBe(false);
  expect(rangesOverlap(0, 3, 2, 4)).toBe(true);
});

test('rejects empty, unsafe, and inequality fragments', () => {
  expect(isSafeLatex("f'(x)\\gt 0")).toBe(true);
  expect(isSafeLatex("f'(x)>0")).toBe(false);
  expect(isSafeLatex('\\renewcommand{\\a}{b}')).toBe(false);
  expect(isValidMixedLatex("若 \\(f'(x)\\gt 0\\) 则单调递增")).toBe(true);
  expect(isValidMixedLatex("若 \\(f'(x)>0\\) 则单调递增")).toBe(false);
  expect(mixedLatexHasAngleBrackets("若 \\(f'(x)>0\\) 则单调递增")).toBe(true);
  expect(isValidMixedLatex('broken \\(x^2')).toBe(false);
});

test('can defer bare-math inference for Markdown without changing the default', () => {
  expect(parseInlineLatex('x^2')).toEqual([{ kind: 'math', latex: 'x^2', start: 0, end: 3 }]);
  expect(parseInlineLatex('**x^2**', { detectBareMath: false })).toEqual([
    { kind: 'text', text: '**x^2**', start: 0, end: 7 },
  ]);
  expect(parseInlineLatex(String.raw`\(x*y\)`, { detectBareMath: false })).toEqual([
    { kind: 'math', latex: 'x*y', start: 0, end: 7 },
  ]);
});
