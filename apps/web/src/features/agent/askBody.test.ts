import { expect, test } from 'vitest';
import { parseAskBody, parseAskInline, parseAskProse } from './askBody';

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

test('parses bold and italic without leaving asterisks', () => {
  expect(
    parseAskInline(
      '∈ asks whether something is an *element* (member) of a set; ⊆ asks whether one *set* is completely contained in another.',
    ),
  ).toEqual([
    { kind: 'text', text: '∈ asks whether something is an ' },
    { kind: 'italic', text: 'element' },
    { kind: 'text', text: ' (member) of a set; ⊆ asks whether one ' },
    { kind: 'italic', text: 'set' },
    { kind: 'text', text: ' is completely contained in another.' },
  ]);
  expect(parseAskInline('Use **∈** for a member and *⊆* for a subset.')).toEqual([
    { kind: 'text', text: 'Use ' },
    { kind: 'bold', text: '∈' },
    { kind: 'text', text: ' for a member and ' },
    { kind: 'italic', text: '⊆' },
    { kind: 'text', text: ' for a subset.' },
  ]);
});

test('does not treat asterisks inside inline math as emphasis', () => {
  expect(parseAskInline('The product is \\(a*b\\) not *addition*.')).toEqual([
    { kind: 'text', text: 'The product is \\(a*b\\) not ' },
    { kind: 'italic', text: 'addition' },
    { kind: 'text', text: '.' },
  ]);
});

test('bold around inline math does not steal later italics', () => {
  expect(
    parseAskInline(
      '**\\(\\in\\)** asks whether something is an *element* (member) of a set; **⊆** asks whether one *set* is completely contained in another.',
    ),
  ).toEqual([
    { kind: 'bold', text: '\\(\\in\\)' },
    { kind: 'text', text: ' asks whether something is an ' },
    { kind: 'italic', text: 'element' },
    { kind: 'text', text: ' (member) of a set; ' },
    { kind: 'bold', text: '⊆' },
    { kind: 'text', text: ' asks whether one ' },
    { kind: 'italic', text: 'set' },
    { kind: 'text', text: ' is completely contained in another.' },
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

test.each([
  'Compute 2 * 3 * 4.',
  'Use * spaced * markers.',
  'Unclosed **bold and *italic',
  '****unsupported****',
  '*first\nsecond*',
  'Budget is $5 today and $10 tomorrow.',
])('preserves literal or malformed markers: %s', (source) => {
  expect(parseAskInline(source)).toEqual([{ kind: 'text', text: source }]);
});

test('honors star escapes and backslash parity without changing LaTeX', () => {
  expect(parseAskInline(String.raw`Use \*literal\* and *real*.`)).toEqual([
    { kind: 'text', text: 'Use *literal* and ' },
    { kind: 'italic', text: 'real' },
    { kind: 'text', text: '.' },
  ]);
  expect(parseAskInline(String.raw`\\*real*`)).toEqual([
    { kind: 'text', text: '\\' },
    { kind: 'italic', text: 'real' },
  ]);
});

test('parses emphasis before bare-formula inference', () => {
  expect(parseAskInline('**x^2** + **y^2**')).toEqual([
    { kind: 'bold', text: 'x^2' },
    { kind: 'text', text: ' + ' },
    { kind: 'bold', text: 'y^2' },
  ]);
  expect(parseAskInline('*x^2*')).toEqual([{ kind: 'italic', text: 'x^2' }]);
});

test.each([
  ['**outer *inner* outer**', 'bold'],
  ['*outer **inner** outer*', 'italic'],
] as const)('supports nested emphasis: %s', (source, kind) => {
  expect(parseAskInline(source)).toEqual([
    { kind, text: 'outer ' },
    { kind: 'bold-italic', text: 'inner' },
    { kind, text: ' outer' },
  ]);
});

test('supports triple emphasis and combined closing runs', () => {
  expect(parseAskInline('***important***')).toEqual([{ kind: 'bold-italic', text: 'important' }]);
  expect(parseAskInline('**outer *inner***')).toEqual([
    { kind: 'bold', text: 'outer ' },
    { kind: 'bold-italic', text: 'inner' },
  ]);
});

test.each([String.raw`\(a*b\)`, '$a*b$', String.raw`\[a*b\]`, '$$a*b$$', '“x^2 * y^2”'])(
  'keeps math opaque inside nested emphasis: %s',
  (math) => {
    expect(parseAskInline(`***${math}*** and *words*`)).toEqual([
      { kind: 'bold-italic', text: math },
      { kind: 'text', text: ' and ' },
      { kind: 'italic', text: 'words' },
    ]);
  },
);

test('preserves unmatched inline math for the existing error renderer', () => {
  const source = String.raw`Broken \(x * y and *words*`;
  expect(parseAskInline(source)).toEqual([{ kind: 'text', text: source }]);
});

test.each(['**penting** dan *anggota*', '**重要**和*元素*'])(
  'supports Indonesian and Chinese prose: %s',
  (source) => {
    expect(parseAskInline(source).map((part) => part.kind)).toEqual(['bold', 'text', 'italic']);
  },
);

test('handles a maximum-length malformed delimiter run within the render budget', () => {
  const source = '*'.repeat(12000);
  const start = performance.now();
  expect(parseAskInline(source)).toEqual([{ kind: 'text', text: source }]);
  expect(performance.now() - start).toBeLessThan(500);
});

test.each(['x*y^2*z', 'x^{*}+y^{*}', 'x^2 * y^2 * z', String.raw`\frac{x^{*}}{y^{*}}`])(
  'preserves bare LaTeX operators: %s',
  (source) => {
    expect(parseAskInline(source)).toEqual([{ kind: 'text', text: source }]);
  },
);
