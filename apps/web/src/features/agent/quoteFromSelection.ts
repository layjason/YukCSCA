import { QUOTE_MAX_LENGTH, TEXT_QUOTE_MAX_LENGTH, type MathBlockSource } from './types';

export type QuoteKind = 'MATH' | 'TEXT';

export interface HostQuote {
  quote: string;
  kind: QuoteKind;
}

function asElement(node: Node | null): Element | null {
  if (!node) return null;
  return node instanceof Element ? node : node.parentElement;
}

function mathBlockFromNode(node: Node | null): HTMLElement | null {
  const el = asElement(node);
  return (el?.closest('.learn-content-block-math') as HTMLElement | null) ?? null;
}

function intersectingMathBlock(range: Range, root: HTMLElement): HTMLElement | null {
  const startMath = mathBlockFromNode(range.startContainer);
  const endMath = mathBlockFromNode(range.endContainer);
  if (startMath && root.contains(startMath)) return startMath;
  if (endMath && root.contains(endMath)) return endMath;

  const ancestor = asElement(range.commonAncestorContainer);
  if (!ancestor) return null;
  const candidates = ancestor.querySelectorAll('.learn-content-block-math');
  for (const node of candidates) {
    if (!(node instanceof HTMLElement)) continue;
    if (!root.contains(node)) continue;
    try {
      if (range.intersectsNode(node)) return node;
    } catch {
      // jsdom may throw for detached nodes
    }
  }
  return null;
}

function rangeIntersectsNode(range: Range, node: Node): boolean {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

function latexHost(node: Node | null): HTMLElement | null {
  const el = asElement(node);
  return (el?.closest('.learn-math[data-latex]') as HTMLElement | null) ?? null;
}

function sliceTextNode(node: Text, range: Range): string {
  const length = node.data.length;
  let from = 0;
  let to = length;
  if (typeof range.comparePoint === 'function') {
    while (from < length && range.comparePoint(node, from) < 0) from += 1;
    while (to > from && range.comparePoint(node, to) > 0) to -= 1;
  } else {
    if (node === range.startContainer) from = range.startOffset;
    if (node === range.endContainer) to = range.endOffset;
  }
  return node.data.slice(from, to);
}

/** Rebuild host text so inline KaTeX is quoted as `\(...\)` instead of glyph/ARIA noise. */
function serializeSelectedHostText(range: Range, root: HTMLElement): string {
  const parts: string[] = [];
  const seenLatex = new Set<HTMLElement>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node instanceof HTMLElement && node.matches('.learn-math[data-latex]')) {
      if (rangeIntersectsNode(range, node) && !seenLatex.has(node)) {
        seenLatex.add(node);
        const latex = node.dataset.latex?.trim() ?? '';
        if (latex.length > 0) parts.push(`\\(${latex}\\)`);
      }
    } else if (node.nodeType === Node.TEXT_NODE && !latexHost(node)) {
      if (rangeIntersectsNode(range, node)) {
        const sliced = sliceTextNode(node as Text, range);
        if (sliced.length > 0) parts.push(sliced);
      }
    }
    node = walker.nextNode();
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function quoteFromSelection(
  selection: Selection | null,
  root: HTMLElement | null,
  mathBlocks: readonly MathBlockSource[],
): HostQuote | null {
  if (!selection || selection.isCollapsed || !root) return null;
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const ancestor = asElement(range.commonAncestorContainer);
  if (!ancestor || !root.contains(ancestor)) return null;

  const mathEl = intersectingMathBlock(range, root);
  if (mathEl) {
    const index = Number(mathEl.dataset.blockIndex);
    const match = mathBlocks.find((block) => block.index === index);
    const latex = match?.latex.trim() ?? '';
    if (latex.length >= 1) {
      return { quote: latex.slice(0, QUOTE_MAX_LENGTH), kind: 'MATH' };
    }
  }

  const reconstructed = serializeSelectedHostText(range, root);
  const text =
    reconstructed.length > 0 ? reconstructed : selection.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 1) return null;
  return { quote: text.slice(0, TEXT_QUOTE_MAX_LENGTH), kind: 'TEXT' };
}
