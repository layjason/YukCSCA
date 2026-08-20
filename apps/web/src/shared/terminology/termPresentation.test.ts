import { expect, test } from 'vitest';
import {
  selectedLookupText,
  splitTextBySpans,
  termAccessibleName,
  uniqueSpansByTermId,
} from './termPresentation';
import type { TermCard } from './types';

const card: TermCard = {
  termId: '00000000-0000-4000-8000-0000000000t1',
  subject: 'MATHEMATICS',
  packageId: '00000000-0000-4000-8000-0000000000a1',
  termClass: 'TOPIC_TERM',
  primarySurface: { text: '公因式', pinyin: 'gōng yīn shì', audioAvailable: false },
  aliases: [],
  definition: { availability: 'AVAILABLE', language: 'en', text: 'Common factor' },
  englishEquivalent: 'common factor',

  symbols: null,
  example: null,
  outlineItemIds: [],
};

test('termAccessibleName uses characters plus definition, not pinyin alone', () => {
  expect(termAccessibleName(card, 'unavailable')).toBe('公因式. Common factor');
});

test('termAccessibleName uses the explicit unavailable phrase', () => {
  expect(
    termAccessibleName(
      {
        ...card,
        definition: { availability: 'LANGUAGE_UNAVAILABLE', requestedLanguage: 'id' },
      },
      'No definition in this language',
    ),
  ).toBe('公因式. No definition in this language');
});

test('splitTextBySpans keeps UTF-16 offsets and skips overlaps', () => {
  const text = '求公因式';
  const parts = splitTextBySpans(text, [
    { startOffset: 1, endOffset: 4, termId: 't1', surfaceForm: '公因式' },
    { startOffset: 0, endOffset: 1, termId: 't2', surfaceForm: '求' },
    { startOffset: 0, endOffset: 4, termId: 't3', surfaceForm: 'overlap' },
  ]);
  expect(parts.map((part) => part.text)).toEqual(['求', '公因式']);
  expect(parts[0]?.span?.termId).toBe('t2');
  expect(parts[1]?.span?.termId).toBe('t1');
});

test('selectedLookupText rejects empty or sentence-like selections', () => {
  expect(selectedLookupText('  求  ')).toBe('求');
  expect(selectedLookupText('')).toBeNull();
  expect(selectedLookupText('已知函数 f(x) 在区间上单调递增，则导数大于零。')).toBeNull();
});

test('uniqueSpansByTermId keeps first encounter', () => {
  expect(
    uniqueSpansByTermId([
      { termId: 'a', surfaceForm: '如图' },
      { termId: 'b', surfaceForm: '场强' },
      { termId: 'a', surfaceForm: '如图' },
    ]),
  ).toEqual([
    { termId: 'a', surfaceForm: '如图' },
    { termId: 'b', surfaceForm: '场强' },
  ]);
});
