import { expect, test } from 'vitest';
import {
  adminCheckedTermIds,
  autoMatchTermIds,
  matchDraftTermSpans,
  suggestedTermIdsInStem,
} from './matchDraftTermSpans';
import type { TermDraft } from './types';

function term(partial: Partial<TermDraft> & Pick<TermDraft, 'id' | 'termClass'>): TermDraft {
  return {
    surfaceForms: [{ text: '求', pinyin: 'qiu' }],
    definitions: { indonesian: 'cari', english: 'find', simplifiedChinese: '求' },
    englishEquivalent: 'find',
    outlineItemIds: [],
    ...partial,
  };
}

test('auto-matches exam wording and required topic terms, not extra topic terms', () => {
  const required = term({
    id: 't-req',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '场强', pinyin: 'chang qiang' }],
  });
  const extra = term({
    id: 't-extra',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '真空', pinyin: 'zhen kong' }],
  });
  const instruction = term({
    id: 't-ins',
    termClass: 'EXAM_INSTRUCTION',
    surfaceForms: [{ text: '如图', pinyin: 'ru tu' }],
  });
  const lighting = autoMatchTermIds([required, extra, instruction], new Set(['t-req']));
  const spans = matchDraftTermSpans('如图，真空中场强', [required, extra, instruction], lighting);
  expect(spans.map((span) => span.surfaceForm)).toEqual(expect.arrayContaining(['如图', '场强']));
  expect(spans).toHaveLength(2);
});

test('suggested presets are the auto-matches that actually appear in the stem', () => {
  const required = term({
    id: 't-req',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '场强', pinyin: 'chang qiang' }],
  });
  const extra = term({
    id: 't-extra',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '真空', pinyin: 'zhen kong' }],
  });
  const instruction = term({
    id: 't-ins',
    termClass: 'EXAM_INSTRUCTION',
    surfaceForms: [{ text: '如图', pinyin: 'ru tu' }],
  });
  const suggested = suggestedTermIdsInStem(
    ['如图，真空中场强'],
    [required, extra, instruction],
    new Set(['t-req']),
  );
  expect([...suggested].sort()).toEqual(['t-ins', 't-req']);
});

test('admin checks suggested presets plus extra pins until a preset is saved, then exclusive', () => {
  const required = term({
    id: 't-req',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '场强', pinyin: 'chang qiang' }],
  });
  const extra = term({
    id: 't-extra',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '真空', pinyin: 'zhen kong' }],
  });
  const instruction = term({
    id: 't-ins',
    termClass: 'EXAM_INSTRUCTION',
    surfaceForms: [{ text: '如图', pinyin: 'ru tu' }],
  });
  const terms = [required, extra, instruction];
  const texts = ['如图，真空中场强'];
  const requiredIds = new Set(['t-req']);

  const suggestedPlusPin = adminCheckedTermIds(texts, terms, requiredIds, [{ termId: 't-extra' }]);
  expect([...suggestedPlusPin].sort()).toEqual(['t-extra', 't-ins', 't-req']);

  const uncheckedInstruction = adminCheckedTermIds(texts, terms, requiredIds, [
    { termId: 't-req' },
    { termId: 't-extra' },
  ]);
  expect([...uncheckedInstruction].sort()).toEqual(['t-extra', 't-req']);
  expect(
    matchDraftTermSpans('如图，真空中场强', terms, uncheckedInstruction).map(
      (span) => span.surfaceForm,
    ),
  ).toEqual(expect.arrayContaining(['真空', '场强']));
  expect(matchDraftTermSpans('如图，真空中场强', terms, uncheckedInstruction)).toHaveLength(2);
});

test('skips inline latex ranges', () => {
  const instruction = term({
    id: 't-ins',
    termClass: 'EXAM_INSTRUCTION',
    surfaceForms: [{ text: '求', pinyin: 'qiu' }],
  });
  const spans = matchDraftTermSpans('求 \\(求\\) 值', [instruction], new Set(['t-ins']));
  expect(spans).toHaveLength(1);
  expect(spans[0]?.startOffset).toBe(0);
});
