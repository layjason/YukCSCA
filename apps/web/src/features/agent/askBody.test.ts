import { expect, test } from 'vitest';
import { parseAskBody } from './askBody';

test('keeps plain prose as one segment', () => {
  expect(parseAskBody('Hello, I am YukCSCA Ask.')).toEqual([
    { kind: 'prose', text: 'Hello, I am YukCSCA Ask.' },
  ]);
});

test('splits bracket display math from surrounding prose', () => {
  expect(parseAskBody('Solve \\[x^2-5x+6<0\\] on the line.')).toEqual([
    { kind: 'prose', text: 'Solve ' },
    { kind: 'display', latex: 'x^2-5x+6<0' },
    { kind: 'prose', text: ' on the line.' },
  ]);
});

test('splits dollar display math', () => {
  expect(parseAskBody('See $$A \\cap B$$ next.')).toEqual([
    { kind: 'prose', text: 'See ' },
    { kind: 'display', latex: 'A \\cap B' },
    { kind: 'prose', text: ' next.' },
  ]);
});

test('leaves unmatched openers as prose', () => {
  expect(parseAskBody('Broken \\[no close')).toEqual([
    { kind: 'prose', text: 'Broken ' },
    { kind: 'prose', text: '\\[no close' },
  ]);
});
