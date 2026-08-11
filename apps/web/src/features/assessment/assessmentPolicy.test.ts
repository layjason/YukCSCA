import { describe, expect, it } from 'vitest';
import {
  allItemsAnswered,
  allItemsLocked,
  canFinishInProgressSession,
  canLockAnswer,
  containsProhibitedMasteryClaim,
  feedbackVisibleForItem,
  isHintActionDisabled,
  nextHintTier,
  resultCopyKind,
  resumeItemIndex,
  shouldAutoSubmitAfterLastImmediateLock,
  shouldConfirmBeforeHint,
  scoreFromItems,
} from './assessmentPolicy';
import type { AssessmentSession, SessionItemView } from './types';

function item(
  partial: Partial<SessionItemView> & Pick<SessionItemView, 'itemId'>,
): SessionItemView {
  return {
    order: 0,
    questionId: 'q1',
    status: 'OPEN',
    stem: [],
    options: [],
    hintTierCount: 0,
    disclosedTierCount: 0,
    hintLadder: [],
    disclosedHints: [],
    strongAssistance: false,
    selectedOptionKey: null,
    correct: null,
    feedback: null,
    outlineItemIds: [],
    objectiveIds: [],
    ...partial,
  };
}

describe('hint ladder policy', () => {
  it('selects next undisclosed tier and flags STRONG confirm', () => {
    const view = item({
      itemId: 'i1',
      hintLadder: [
        { tierIndex: 0, strength: 'STANDARD', disclosed: true },
        { tierIndex: 1, strength: 'STRONG', disclosed: false },
      ],
    });
    expect(nextHintTier(view)?.tierIndex).toBe(1);
    expect(shouldConfirmBeforeHint(view)).toBe(true);
  });

  it('disables STRONG on REVALIDATION without probing', () => {
    const view = item({
      itemId: 'i1',
      hintLadder: [{ tierIndex: 0, strength: 'STRONG', disclosed: false }],
    });
    expect(isHintActionDisabled(view, 'REVALIDATION')).toEqual({
      disabled: true,
      reason: 'revalidation_strong',
    });
    expect(isHintActionDisabled(view, 'CHECKPOINT').disabled).toBe(false);
  });
});

describe('session player policy', () => {
  it('resumes at first unanswered OPEN item', () => {
    const items = [
      item({ itemId: 'a', status: 'LOCKED', selectedOptionKey: 'A' }),
      item({ itemId: 'b', status: 'OPEN', selectedOptionKey: null }),
      item({ itemId: 'c', status: 'OPEN', selectedOptionKey: 'B' }),
    ];
    expect(resumeItemIndex(items)).toBe(1);
  });

  it('locks answer only with selection on OPEN item', () => {
    const open = item({ itemId: 'a', status: 'OPEN' });
    expect(canLockAnswer(open, null)).toBe(false);
    expect(canLockAnswer(open, 'A')).toBe(true);
    expect(canLockAnswer(item({ itemId: 'b', status: 'LOCKED' }), 'A')).toBe(false);
  });

  it('shows IMMEDIATE feedback after lock and SET_END only after submit', () => {
    const locked = item({
      itemId: 'a',
      status: 'LOCKED',
      correct: true,
      feedback: {
        correct: true,
        correctOptionKey: 'A',
        explanations: [],
        commonMistakeNotes: [],
        relatedResources: [],
      },
    });
    expect(feedbackVisibleForItem(locked, 'IMMEDIATE', 'IN_PROGRESS')).toBe(true);
    expect(feedbackVisibleForItem(locked, 'SET_END', 'IN_PROGRESS')).toBe(false);
    expect(feedbackVisibleForItem(locked, 'SET_END', 'SUBMITTED')).toBe(true);
  });

  it('detects SET_END ready-to-submit and last IMMEDIATE auto-submit', () => {
    const answered = [
      item({ itemId: 'a', status: 'OPEN', selectedOptionKey: 'A' }),
      item({ itemId: 'b', status: 'LOCKED', selectedOptionKey: 'B' }),
    ];
    expect(allItemsAnswered(answered)).toBe(true);

    const session = {
      feedbackMode: 'IMMEDIATE',
      items: [item({ itemId: 'a', status: 'LOCKED' }), item({ itemId: 'b', status: 'OPEN' })],
    } as AssessmentSession;
    expect(
      shouldAutoSubmitAfterLastImmediateLock(session, item({ itemId: 'b', status: 'LOCKED' })),
    ).toBe(true);
  });

  it('allows finish for IMMEDIATE only when every item is locked (resume / submit-failure recovery)', () => {
    const lockedItems = [
      item({ itemId: 'a', status: 'LOCKED', selectedOptionKey: 'A' }),
      item({ itemId: 'b', status: 'LOCKED', selectedOptionKey: 'B' }),
    ];
    expect(allItemsLocked(lockedItems)).toBe(true);
    expect(
      canFinishInProgressSession({
        status: 'IN_PROGRESS',
        feedbackMode: 'IMMEDIATE',
        items: lockedItems,
      }),
    ).toBe(true);
    expect(
      canFinishInProgressSession({
        status: 'IN_PROGRESS',
        feedbackMode: 'IMMEDIATE',
        items: [
          item({ itemId: 'a', status: 'LOCKED' }),
          item({ itemId: 'b', status: 'OPEN', selectedOptionKey: 'B' }),
        ],
      }),
    ).toBe(false);
    expect(
      canFinishInProgressSession({
        status: 'SUBMITTED',
        feedbackMode: 'IMMEDIATE',
        items: lockedItems,
      }),
    ).toBe(false);
    expect(
      canFinishInProgressSession({
        status: 'IN_PROGRESS',
        feedbackMode: 'SET_END',
        items: [
          item({ itemId: 'a', status: 'OPEN', selectedOptionKey: 'A' }),
          item({ itemId: 'b', status: 'OPEN', selectedOptionKey: 'B' }),
        ],
      }),
    ).toBe(true);
  });
});

describe('result copy', () => {
  it('never uses mastery claims for checkpoint pass/fail', () => {
    expect(resultCopyKind('CHECKPOINT', true, 2, 2)).toBe('checkpoint_pass');
    expect(resultCopyKind('CHECKPOINT', false, 1, 2)).toBe('checkpoint_fail');
    expect(resultCopyKind('TOPIC_PRACTICE', null, 1, 2)).toBe('topic_score');
    expect(containsProhibitedMasteryClaim('Checkpoint passed')).toBe(false);
    expect(containsProhibitedMasteryClaim('Mastered')).toBe(true);
    expect(containsProhibitedMasteryClaim('Stable Mastery')).toBe(true);
  });

  it('scores items from review projection', () => {
    expect(
      scoreFromItems([
        item({ itemId: 'a', correct: true }),
        item({ itemId: 'b', correct: false }),
        item({ itemId: 'c', correct: true }),
      ]),
    ).toEqual({ correctCount: 2, total: 3 });
  });
});
