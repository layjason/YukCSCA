/** Inline KaTeX in TEXT-like strings. Supports `\(...\)` and single-dollar `$...$` delimiters. */
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
export function parseInlineLatex(
  source: string,
  { detectBareMath = true }: { detectBareMath?: boolean } = {},
): InlineLatexSegment[] {
  if (!source) return [];
  const trimmed = source.trim();
  const unquoted = unquote(trimmed);
  const openFirst = source.indexOf(INLINE_LATEX_OPEN);
  const dollarFirst = findDollarMath(source, 0);
  const displayBracketFirst = findDisplayBracketMath(source, 0);
  const displayDollarFirst = findDisplayDollarMath(source, 0);

  if (
    detectBareMath &&
    openFirst < 0 &&
    !dollarFirst &&
    !displayBracketFirst &&
    !displayDollarFirst &&
    looksLikePureLatex(unquoted)
  ) {
    if (unquoted === trimmed) {
      return [{ kind: 'math', latex: unquoted, start: 0, end: source.length }];
    }
    const qOpen = source.indexOf(trimmed[0]!);
    const qClose = source.lastIndexOf(trimmed[trimmed.length - 1]!);
    if (qOpen >= 0 && qClose > qOpen) {
      const segments: InlineLatexSegment[] = [];
      if (qOpen > 0) {
        segments.push({ kind: 'text', text: source.slice(0, qOpen), start: 0, end: qOpen });
      }
      segments.push({
        kind: 'text',
        text: source.slice(qOpen, qOpen + 1),
        start: qOpen,
        end: qOpen + 1,
      });
      segments.push({ kind: 'math', latex: unquoted, start: qOpen + 1, end: qClose });
      segments.push({
        kind: 'text',
        text: source.slice(qClose, qClose + 1),
        start: qClose,
        end: qClose + 1,
      });
      if (qClose + 1 < source.length) {
        segments.push({
          kind: 'text',
          text: source.slice(qClose + 1),
          start: qClose + 1,
          end: source.length,
        });
      }
      return segments;
    }
  }

  const segments: InlineLatexSegment[] = [];
  let index = 0;
  while (index < source.length) {
    const inline = findInlineLatexMath(source, index);
    const displayBracket = findDisplayBracketMath(source, index);
    const displayDollar = findDisplayDollarMath(source, index);
    const dollar = findDollarMath(source, index);
    const quoted = findQuotedMath(source, index);

    let earliest:
      | { kind: 'unmatched'; open: number; close: number; latex: string }
      | { kind: 'math'; open: number; close: number; latex: string }
      | null = null;

    const candidates = [
      inline,
      displayBracket
        ? {
            kind: 'math' as const,
            open: displayBracket.open,
            close: displayBracket.close,
            latex: displayBracket.latex,
          }
        : null,
      displayDollar
        ? {
            kind: 'math' as const,
            open: displayDollar.open,
            close: displayDollar.close,
            latex: displayDollar.latex,
          }
        : null,
      dollar
        ? {
            kind: 'math' as const,
            open: dollar.open,
            close: dollar.close,
            latex: dollar.latex,
          }
        : null,
      quoted
        ? {
            kind: 'math' as const,
            open: quoted.open,
            close: quoted.close,
            latex: quoted.latex,
          }
        : null,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (!earliest || candidate.open < earliest.open) {
        earliest = candidate;
      }
    }

    if (!earliest) {
      segments.push({ kind: 'text', text: source.slice(index), start: index, end: source.length });
      break;
    }

    if (earliest.open > index) {
      segments.push({
        kind: 'text',
        text: source.slice(index, earliest.open),
        start: index,
        end: earliest.open,
      });
    }

    if (earliest.kind === 'unmatched') {
      segments.push({
        kind: 'unmatched',
        text: earliest.latex,
        start: earliest.open,
        end: source.length,
      });
      break;
    }

    segments.push({
      kind: 'math',
      latex: earliest.latex,
      start: earliest.open,
      end: earliest.close + 1,
    });
    index = earliest.close + 1;
  }
  return segments;
}

function findInlineLatexMath(
  source: string,
  from: number,
): { kind: 'math' | 'unmatched'; open: number; close: number; latex: string } | null {
  const open = source.indexOf(INLINE_LATEX_OPEN, from);
  if (open < 0) return null;
  const close = source.indexOf(INLINE_LATEX_CLOSE, open + INLINE_LATEX_OPEN.length);
  if (close < 0) {
    return { kind: 'unmatched', open, close: source.length - 1, latex: source.slice(open) };
  }
  return {
    kind: 'math',
    open,
    close: close + INLINE_LATEX_CLOSE.length - 1,
    latex: source.slice(open + INLINE_LATEX_OPEN.length, close),
  };
}

function findDisplayBracketMath(
  source: string,
  from: number,
): { open: number; close: number; latex: string } | null {
  const open = source.indexOf('\\[', from);
  if (open < 0) return null;
  const close = source.indexOf('\\]', open + 2);
  if (close < 0) return null;
  const latex = source.slice(open + 2, close).trim();
  if (!isSafeLatex(latex)) return null;
  return { open, close: close + 1, latex };
}

function findDisplayDollarMath(
  source: string,
  from: number,
): { open: number; close: number; latex: string } | null {
  const open = source.indexOf('$$', from);
  if (open < 0) return null;
  const close = source.indexOf('$$', open + 2);
  if (close < 0) return null;
  const latex = source.slice(open + 2, close).trim();
  if (!isSafeLatex(latex)) return null;
  return { open, close: close + 1, latex };
}

const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['“', '”'],
  ['"', '"'],
  ['‘', '’'],
  ["'", "'"],
];

function findQuotedMath(
  source: string,
  from: number,
): { open: number; close: number; latex: string } | null {
  let earliest: { open: number; close: number; latex: string } | null = null;
  for (const [openChar, closeChar] of QUOTE_PAIRS) {
    let qOpen = source.indexOf(openChar, from);
    while (qOpen >= 0) {
      const qClose = source.indexOf(closeChar, qOpen + 1);
      if (qClose < 0) break;
      const inner = source.slice(qOpen + 1, qClose).trim();
      if (looksLikePureLatex(inner)) {
        if (!earliest || qOpen < earliest.open) {
          earliest = { open: qOpen + 1, close: qClose - 1, latex: inner };
        }
        break;
      }
      qOpen = source.indexOf(openChar, qClose + 1);
    }
  }
  return earliest;
}

function findDollarMath(
  source: string,
  from: number,
): { open: number; close: number; latex: string } | null {
  let open = nextSingleDollar(source, from);
  while (open >= 0) {
    const close = nextSingleDollar(source, open + 1);
    if (close < 0) return null;
    const raw = source.slice(open + 1, close);
    const latex = raw.trim();
    if (looksLikeDollarMath(raw)) return { open, close, latex };
    open = nextSingleDollar(source, close + 1);
  }
  return null;
}

function nextSingleDollar(source: string, from: number): number {
  let index = source.indexOf('$', from);
  while (index >= 0) {
    const escaped = index > 0 && source[index - 1] === '\\';
    const adjacent = source[index - 1] === '$' || source[index + 1] === '$';
    if (!escaped && !adjacent) return index;
    index = source.indexOf('$', index + 1);
  }
  return -1;
}

function looksLikeDollarMath(latex: string): boolean {
  if (!latex || latex.length > INLINE_LATEX_MAX_FRAGMENT) return false;
  const trimmed = latex.trim();
  if (/^[\d\s,.;:+(){}\x5b\x5d-]+$/.test(trimmed)) return true;
  if (!/[A-Za-z\\_^=<>≤≥≠√π∞±×÷∪∩∈]/.test(trimmed)) return false;
  if (!/^\s|\s$/.test(latex)) return true;
  if (!/^[\d\s,.;:+\-(){}\x5b\x5d^_=\\A-Za-z±×÷≤≥≠√π∞∪∩∈]+$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter((word) => /^[A-Za-z]{2,}$/.test(word));
  const mathWords = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'max', 'min']);
  return words.every((word) => mathWords.has(word));
}

export function unquote(source: string): string {
  if (!source || source.length < 2) return source;
  const trimmed = source.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (
    (first === '“' && last === '”') ||
    (first === '"' && last === '"') ||
    (first === '‘' && last === '’') ||
    (first === "'" && last === "'")
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function looksLikePureLatex(source: string): boolean {
  if (!source || source.length > INLINE_LATEX_MAX_FRAGMENT) return false;
  const trimmed = unquote(source.trim());
  if (trimmed.startsWith(INLINE_LATEX_OPEN) || trimmed.startsWith('$')) return false;
  if (!isSafeLatex(trimmed)) return false;
  if (/^\s*\\[a-zA-Z]+/.test(trimmed)) return true;
  if (/^[a-zA-Z0-9\s\\{}_^=+\-*/.,:;()±×÷≤≥≠√π∞∪∩∈]+$/.test(trimmed)) {
    const hasMathSyntax = /[\\_^=±×÷≤≥≠√π∞∪∩∈]/.test(trimmed);
    const words = trimmed.split(/\s+/).filter((w) => /^[a-zA-Z]{2,}$/.test(w));
    const mathWords = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'max', 'min']);
    return hasMathSyntax && words.every((word) => mathWords.has(word));
  }
  return false;
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
