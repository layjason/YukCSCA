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

  const text = selection.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 1) return null;
  return { quote: text.slice(0, TEXT_QUOTE_MAX_LENGTH), kind: 'TEXT' };
}
