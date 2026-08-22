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
