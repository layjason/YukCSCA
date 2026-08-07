import { describe, expect, test } from 'vitest';
import {
  buildMockQuestionSlots,
  createEmptyMockShell,
  ensureSingleMockShell,
  filterMockSelectionForLanguage,
  questionsMatchingExamLanguage,
  sumMockPoints,
} from './mockDraft';
import type { Question } from './types';

function q(id: string, examLanguage: 'en' | 'zh-CN'): Question {
  return {
    id,
    examLanguage,
    difficulty: 'STANDARD',
    stem: [{ kind: 'TEXT', text: id }],
    options: [
      { key: 'A', blocks: [{ kind: 'TEXT', text: 'a' }] },
      { key: 'B', blocks: [{ kind: 'TEXT', text: 'b' }] },
    ],
    correctOptionKey: 'A',
    explanations: [{ language: 'en', blocks: [{ kind: 'TEXT', text: 'x' }] }],
    outlineItemIds: [],
    objectiveIds: [],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: null,
      reviewedAt: null,
    },
  };
}

describe('mockDraft', () => {
  test('buildMockQuestionSlots rebalances total points evenly at capacity', () => {
    const ids = Array.from({ length: 48 }, (_, i) => `q-${i}`);
    const slots = buildMockQuestionSlots(ids, 48, 100);
    expect(slots).toHaveLength(48);
    expect(sumMockPoints(slots)).toBe(100);
    // Even distribution for 100/48 → four slots get 3, rest get 2.
    expect(slots.filter((s) => s.points === 3)).toHaveLength(4);
    expect(slots.filter((s) => s.points === 2)).toHaveLength(44);
  });

  test('buildMockQuestionSlots uses arbitrary capacity and totals', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `q-${i}`);
    const slots = buildMockQuestionSlots(ids, 10, 50);
    expect(slots).toHaveLength(10);
    expect(sumMockPoints(slots)).toBe(50);
  });

  test('questionsMatchingExamLanguage filters by exam language', () => {
    const questions = [q('a', 'en'), q('b', 'zh-CN'), q('c', 'en')];
    expect(questionsMatchingExamLanguage(questions, 'en').map((x) => x.id)).toEqual(['a', 'c']);
    expect(questionsMatchingExamLanguage(questions, 'zh-CN').map((x) => x.id)).toEqual(['b']);
    expect(questionsMatchingExamLanguage(questions, undefined)).toEqual([]);
  });

  test('filterMockSelectionForLanguage drops incompatible ids and respects capacity', () => {
    const questions = [q('a', 'en'), q('b', 'zh-CN'), q('c', 'en')];
    expect(filterMockSelectionForLanguage(['a', 'b', 'c'], questions, 'en', 48)).toEqual([
      'a',
      'c',
    ]);
    expect(filterMockSelectionForLanguage(['b'], questions, 'en', 48)).toEqual([]);
  });

  test('ensureSingleMockShell seeds empty and keeps first when present', () => {
    const empty = ensureSingleMockShell([]);
    expect(empty).toHaveLength(1);
    expect(empty[0]?.examLanguage).toBe('en');
    expect(empty[0]?.title).toBe('');

    const existing = createEmptyMockShell('zh-CN');
    existing.title = 'Paper';
    const kept = ensureSingleMockShell([existing, createEmptyMockShell()]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.title).toBe('Paper');
    expect(kept[0]?.examLanguage).toBe('zh-CN');
  });
});
