/** Inline KaTeX in TEXT-like strings. Delimiters are the two-character sequences `\(` and `\)`. */
export const INLINE_LATEX_OPEN = '\\(';
export const INLINE_LATEX_CLOSE = '\\)';
export const INLINE_LATEX_MAX_FRAGMENT = 4000;
export const INLINE_LATEX_MAX_FRAGMENTS = 64;

const UNSAFE_COMMANDS = [
  '\\html',
  '\\href',
  '\\url',
  '\\includegraphics',
  '\\def',
  '\\gdef',
  '\\newcommand',
  '\\renewcommand',
  '\\providecommand',
  '\\let',
  '\\input',
  '\\include',
  '\\special',
] as const;

export type InlineLatexSegment =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'math'; latex: string; start: number; end: number }
  | { kind: 'unmatched'; text: string; start: number; end: number };

export interface InlineLatexRange {
  start: number;
  end: number;
}

/** Split source into prose, bounded inline math, and a trailing unmatched opener if present. */
export function parseInlineLatex(source: string): InlineLatexSegment[] {
  if (!source) return [];
  const segments: InlineLatexSegment[] = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf(INLINE_LATEX_OPEN, index);
    if (open < 0) {
      segments.push({ kind: 'text', text: source.slice(index), start: index, end: source.length });
      break;
    }
    if (open > index) {
      segments.push({ kind: 'text', text: source.slice(index, open), start: index, end: open });
    }
    const close = source.indexOf(INLINE_LATEX_CLOSE, open + INLINE_LATEX_OPEN.length);
    if (close < 0) {
      segments.push({
        kind: 'unmatched',
        text: source.slice(open),
        start: open,
        end: source.length,
      });
      break;
    }
    segments.push({
      kind: 'math',
      latex: source.slice(open + INLINE_LATEX_OPEN.length, close),
      start: open,
      end: close + INLINE_LATEX_CLOSE.length,
    });
    index = close + INLINE_LATEX_CLOSE.length;
  }
  return segments;
}

/** UTF-16 ranges that must not receive terminology chips (math + unmatched delimiters). */
export function reservedInlineLatexRanges(source: string): InlineLatexRange[] {
  return parseInlineLatex(source)
    .filter((segment) => segment.kind !== 'text')
    .map((segment) => ({ start: segment.start, end: segment.end }));
}

export function containsInlineLatex(source: string): boolean {
  return parseInlineLatex(source).some((segment) => segment.kind !== 'text');
}

export function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function isSafeLatex(latex: string | null | undefined): boolean {
  if (latex == null || !latex.trim()) return false;
  if (latex.length > INLINE_LATEX_MAX_FRAGMENT) return false;
  const normalized = latex.toLowerCase();
  if (normalized.includes('<') || normalized.includes('>')) return false;
  return !UNSAFE_COMMANDS.some((command) => normalized.includes(command));
}

export function isValidMixedLatex(source: string): boolean {
  let mathCount = 0;
  for (const segment of parseInlineLatex(source)) {
    if (segment.kind === 'unmatched') return false;
    if (segment.kind === 'math') {
      mathCount += 1;
      if (mathCount > INLINE_LATEX_MAX_FRAGMENTS) return false;
      if (!isSafeLatex(segment.latex)) return false;
    }
  }
  return true;
}

export function mixedLatexHasAngleBrackets(source: string): boolean {
  return parseInlineLatex(source).some(
    (segment) =>
      segment.kind === 'math' && (segment.latex.includes('<') || segment.latex.includes('>')),
  );
}
