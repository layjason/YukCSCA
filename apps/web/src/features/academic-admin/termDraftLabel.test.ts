import { describe, expect, test } from 'vitest';
import { termDraftLabel } from './termDraftLabel';
import type { TermDraft } from './types';

function term(overrides: Partial<TermDraft> = {}): TermDraft {
  return {
    id: '00000000-0000-4000-8000-0000000000t1',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '', pinyin: '' }],
    definitions: { indonesian: '', english: '', simplifiedChinese: '' },
    englishEquivalent: '',
    outlineItemIds: [],
    ...overrides,
  };
}

describe('termDraftLabel', () => {
  test('prefers the Chinese surface over the term id', () => {
    expect(
      termDraftLabel(term({ surfaceForms: [{ text: '导数', pinyin: 'dǎo shù' }] }), 'Term 1'),
    ).toBe('导数');
  });

  test('includes aliases beside the primary Chinese surface', () => {
    expect(
      termDraftLabel(
        term({
          surfaceForms: [
            { text: '因式分解', pinyin: 'yīn shì fēn jiě' },
            { text: '分解因式', pinyin: 'fēn jiě yīn shì' },
          ],
        }),
        'Term 1',
      ),
    ).toBe('因式分解 (分解因式)');
  });

  test('does not fall back to the UUID when the surface is empty', () => {
    expect(termDraftLabel(term({ englishEquivalent: 'derivative' }), 'Term 1')).toBe('derivative');
    expect(termDraftLabel(term(), 'Term 1')).toBe('Term 1');
  });
});
