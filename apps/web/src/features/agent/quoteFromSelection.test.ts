import { afterEach, expect, test } from 'vitest';
import { quoteFromSelection } from './quoteFromSelection';

const latex = 'x^{2}-1=' + 'a'.repeat(80);

afterEach(() => {
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
});

function selectNode(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

test('snaps a selection that intersects a MATH block to authored latex', () => {
  document.body.innerHTML = `
    <div data-ask-selection-root>
      <p class="learn-content-block">Text around</p>
      <div class="learn-content-block learn-content-block-math" data-block-index="1">${latex}</div>
    </div>
  `;
  const root = document.querySelector('[data-ask-selection-root]') as HTMLElement;
  const math = root.querySelector('.learn-content-block-math') as HTMLElement;
  selectNode(math);
  const result = quoteFromSelection(window.getSelection(), root, [{ index: 1, latex }]);
  expect(result).toEqual({ quote: latex, kind: 'MATH' });
});

test('uses a short TEXT selection when no MATH block is intersected', () => {
  document.body.innerHTML = `
    <div data-ask-selection-root>
      <p class="learn-content-block learn-content-block-text">Factorisation uses common factors.</p>
    </div>
  `;
  const root = document.querySelector('[data-ask-selection-root]') as HTMLElement;
  const text = root.querySelector('p') as HTMLElement;
  selectNode(text);
  const result = quoteFromSelection(window.getSelection(), root, []);
  expect(result?.kind).toBe('TEXT');
  expect(result?.quote).toContain('Factorisation');
  expect(result?.quote.length).toBeLessThanOrEqual(500);
});

test('returns null when the selection is outside the host root', () => {
  document.body.innerHTML = `
    <div data-ask-selection-root><p>Inside</p></div>
    <p id="outside">Outside</p>
  `;
  const root = document.querySelector('[data-ask-selection-root]') as HTMLElement;
  selectNode(document.getElementById('outside') as HTMLElement);
  expect(quoteFromSelection(window.getSelection(), root, [])).toBeNull();
});
