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
