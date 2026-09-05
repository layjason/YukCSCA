import { looksLikePureLatex, parseInlineLatex } from '@/shared/content/inlineLatex';

export type AskBodySegment = { kind: 'prose'; text: string } | { kind: 'display'; latex: string };

export type AskProseListItem = {
  text: string;
  marker: string | null;
  depth: number;
};

export type AskProseBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'ordered-list'; items: AskProseListItem[] }
  | { kind: 'unordered-list'; items: AskProseListItem[] };

export type AskInlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'bold-italic'; text: string };

const BRACKET_OPEN = '\\[';
const BRACKET_CLOSE = '\\]';
const DOLLAR = '$$';

/**
 * Split an Ask body into prose (inline `\\(...\\)` still handled by MixedProse)
 * and display-math blocks. Models often emit `\\[...\\]` or `$$...$$` even when
 * the prompt asks for inline KaTeX.
 */
export function parseAskBody(source: string): AskBodySegment[] {
  if (!source) return [];
  const segments: AskBodySegment[] = [];
  let index = 0;
  while (index < source.length) {
    const bracket = source.indexOf(BRACKET_OPEN, index);
    const dollars = source.indexOf(DOLLAR, index);
    let open = -1;
    let openLen = 0;
    let closeSeq = '';
    if (bracket >= 0 && (dollars < 0 || bracket <= dollars)) {
      open = bracket;
      openLen = BRACKET_OPEN.length;
      closeSeq = BRACKET_CLOSE;
    } else if (dollars >= 0) {
      open = dollars;
      openLen = DOLLAR.length;
      closeSeq = DOLLAR;
    }
    if (open < 0) {
      pushProse(segments, source.slice(index));
      break;
    }
    if (open > index) {
      pushProse(segments, source.slice(index, open));
    }
    const close = source.indexOf(closeSeq, open + openLen);
    if (close < 0) {
      pushProse(segments, source.slice(open));
      break;
    }
    const latex = source.slice(open + openLen, close).trim();
    if (latex) {
      segments.push({ kind: 'display', latex });
    }
    index = close + closeSeq.length;
  }
  return segments;
}

/** Parse the small, safe Markdown subset allowed in Ask prose into semantic blocks. */
export function parseAskProse(source: string): AskProseBlock[] {
  if (!source) return [];
  const blocks: AskProseBlock[] = [];
  let paragraph: string[] = [];
  let listKind: 'ordered-list' | 'unordered-list' | null = null;
  let listItems: AskProseListItem[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n').trim() });
      paragraph = [];
    }
  };
  const flushList = (): void => {
    if (listKind && listItems.length > 0) {
      blocks.push({ kind: listKind, items: listItems });
    }
    listKind = null;
    listItems = [];
  };

  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^\s*#{1,6}\s+(.+?)\s*$/.exec(line);
    const boldHeading = /^\s*\*\*([^*\n]+)\*\*\s*$/.exec(line);
    if (heading || boldHeading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', text: heading?.[1] ?? boldHeading?.[1] ?? '' });
      continue;
    }

    const topLevelOrdered: RegExpExecArray | null = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    const nestedOrdered: RegExpExecArray | null =
      listKind === 'ordered-list' ? /^\s*(\d+(?:\.\d+)+)\.?\s+(.+)$/.exec(line) : null;
    const ordered: RegExpExecArray | null = topLevelOrdered ?? nestedOrdered;
    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    if (ordered || unordered) {
      flushParagraph();
      const kind: 'ordered-list' | 'unordered-list' = ordered ? 'ordered-list' : 'unordered-list';
      if (listKind !== kind) {
        flushList();
        listKind = kind;
      }
      const marker = ordered?.[1] ?? null;
      listItems.push({
        marker,
        text: (ordered?.[2] ?? unordered?.[1] ?? '').trim(),
        depth: marker ? marker.split('.').length - 1 : 0,
      });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.filter((block) => block.kind !== 'paragraph' || block.text.length > 0);
}

function pushProse(segments: AskBodySegment[], text: string): void {
  if (!text) return;
  segments.push({ kind: 'prose', text });
}

type EmphasisToken = {
  text: string;
  width: number;
  matched: boolean;
  opening: boolean;
};

/**
 * Bounded star emphasis, with explicit/quoted math kept opaque. Bare math is
 * detected later by MixedProse, after Markdown delimiters have been removed.
 * Tokens are visited once in each pass; malformed runs remain literal.
 */
export function parseAskInline(source: string): AskInlinePart[] {
  if (!source) return [];
  // Preserve bare formula operators/superscripts unless a boundary introduces
  // actual emphasis (for example `**x^2** + **y^2**`).
  if (looksLikePureLatex(source) && !/(?:^|\s)\\*\*{1,3}(?=[^\s*])/u.test(source)) {
    return [{ kind: 'text', text: source }];
  }
  const reserved = parseInlineLatex(source, { detectBareMath: false }).filter(
    (segment) => segment.kind !== 'text',
  );
  const tokens: EmphasisToken[] = [];
  const openers: EmphasisToken[] = [];
  const literal = (text: string): void => {
    tokens.push({ text, width: 0, matched: false, opening: false });
  };
  let rangeIndex = 0;
  let index = 0;
  while (index < source.length) {
    while (reserved[rangeIndex] && reserved[rangeIndex]!.end <= index) rangeIndex++;
    const range = reserved[rangeIndex];
    if (range && index >= range.start) {
      const text = source.slice(index, range.end);
      if (text.includes('\n')) openers.length = 0;
      literal(text);
      index = range.end;
      continue;
    }
    // Only Markdown escapes are consumed; LaTeX commands are never unescaped.
    if (source[index] === '\\' && ['*', '\\'].includes(source[index + 1] ?? '')) {
      literal(source[index + 1]!);
      index += 2;
      continue;
    }
    if (source[index] !== '*') {
      if (source[index] === '\n') openers.length = 0;
      literal(source[index]!);
      index++;
      continue;
    }
    const start = index;
    while (source[index] === '*') index++;
    let width = index - start;
    if (width > 3) {
      literal(source.slice(start, index));
      continue;
    }
    const before = source[start - 1] ?? '';
    const after = source[index] ?? '';
    const beforeSpace = !before || /\s/u.test(before);
    const afterSpace = !after || /\s/u.test(after);
    const beforePunctuation = /[\p{P}\p{S}]/u.test(before);
    const afterPunctuation = /[\p{P}\p{S}]/u.test(after);
    const canOpen = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation);
    const canClose = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation);
    if (canClose) {
      while (width > 0) {
        const opener = openers.at(-1);
        if (!opener || opener.width > width) break;
        openers.pop();
        opener.matched = true;
        tokens.push({
          text: '*'.repeat(opener.width),
          width: opener.width,
          matched: true,
          opening: false,
        });
        width -= opener.width;
      }
    }
    if (width > 0) {
      const token = { text: '*'.repeat(width), width, matched: false, opening: true };
      tokens.push(token);
      if (canOpen) openers.push(token);
    }
  }

  const parts: AskInlinePart[] = [];
  let bold = 0;
  let italic = 0;
  for (const token of tokens) {
    if (token.matched) {
      const direction = token.opening ? 1 : -1;
      if (token.width >= 2) bold += direction;
      if (token.width !== 2) italic += direction;
      continue;
    }
    const kind = bold > 0 ? (italic > 0 ? 'bold-italic' : 'bold') : italic > 0 ? 'italic' : 'text';
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += token.text;
    else parts.push({ kind, text: token.text });
  }
  return parts;
}
