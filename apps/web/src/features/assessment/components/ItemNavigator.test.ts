import { describe, expect, it } from 'vitest';
import { itemMarkFor } from './itemMark';
import type { SessionItemView } from '../types';

function item(partial: Partial<SessionItemView> = {}): SessionItemView {
  return {
    itemId: 'i1',
    order: 0,
    questionId: 'q1',
    status: 'LOCKED',
    stem: [],
    options: [],
    hintTierCount: 0,
    disclosedTierCount: 0,
    hintLadder: [],
    disclosedHints: [],
    strongAssistance: false,
    selectedOptionKey: 'A',
    correct: null,
    feedback: null,
    outlineItemIds: [],
    objectiveIds: [],
    languageHelpAvailable: false,
    ...partial,
  };
}

describe('itemMarkFor', () => {
  it('prefers correctness over bare current when scoring is shown', () => {
    expect(itemMarkFor(item({ correct: true }), 0, 0, true)).toBe('correct');
    expect(itemMarkFor(item({ correct: false }), 0, 0, true)).toBe('incorrect');
  });

  it('marks current when correctness is unknown', () => {
    expect(
      itemMarkFor(item({ correct: null, status: 'OPEN', selectedOptionKey: null }), 0, 0, false),
    ).toBe('current');
  });

  it('marks answered locked items without correctness', () => {
    expect(itemMarkFor(item({ correct: null }), 1, 0, false)).toBe('answered');
  });
});
