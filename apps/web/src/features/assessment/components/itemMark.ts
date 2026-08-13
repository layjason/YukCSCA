import type { SessionItemView } from '../types';

export type ItemMark = 'current' | 'unanswered' | 'answered' | 'correct' | 'incorrect';

/**
 * Answer/score mark for a chip. Current selection is layered via `is-current` separately
 * so green/red remain visible during post-submit review.
 */
export function itemMarkFor(
  item: SessionItemView | undefined,
  index: number,
  currentIndex: number,
  showCorrectness: boolean,
): ItemMark {
  if (!item) return index === currentIndex ? 'current' : 'unanswered';
  if (showCorrectness && item.correct === true) return 'correct';
  if (showCorrectness && item.correct === false) return 'incorrect';
  if (index === currentIndex) return 'current';
  if (
    item.status === 'LOCKED' ||
    (item.selectedOptionKey != null && item.selectedOptionKey !== '')
  ) {
    return 'answered';
  }
  return 'unanswered';
}
