export type AskBodySegment = { kind: 'prose'; text: string } | { kind: 'display'; latex: string };

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

function pushProse(segments: AskBodySegment[], text: string): void {
  if (!text) return;
  segments.push({ kind: 'prose', text });
}
