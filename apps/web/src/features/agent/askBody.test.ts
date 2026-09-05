import { expect, test } from 'vitest';
import { parseAskBody, parseAskProse } from './askBody';

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

test('parses headings, paragraphs, and nested numbered items', () => {
  expect(
    parseAskProse(
      '**Key terms**\n\n1. 集合\n1.1 并集（union）\n1.2 交集（intersection）\n\nAsk yourself why.',
    ),
  ).toEqual([
    { kind: 'heading', text: 'Key terms' },
    {
      kind: 'ordered-list',
      items: [
        { marker: '1', text: '集合', depth: 0 },
        { marker: '1.1', text: '并集（union）', depth: 1 },
        { marker: '1.2', text: '交集（intersection）', depth: 1 },
      ],
    },
    { kind: 'paragraph', text: 'Ask yourself why.' },
  ]);
});

test('keeps ordinary numbers as prose', () => {
  expect(parseAskProse('I have 5 apples and in 2026 we will visit room 102.')).toEqual([
    { kind: 'paragraph', text: 'I have 5 apples and in 2026 we will visit room 102.' },
  ]);
  expect(parseAskProse('2026 is the exam year.')).toEqual([
    { kind: 'paragraph', text: '2026 is the exam year.' },
  ]);
});
