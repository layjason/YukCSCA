import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SessionItemView } from '../types';
import { itemMarkFor } from './itemMark';

const WINDOW_SIZE = 5;

interface ItemNavigatorProps {
  items: readonly SessionItemView[];
  currentIndex: number;
  onSelect: (index: number) => void;
  /** When true, use correct/incorrect marks when known on items. */
  showCorrectness: boolean;
}

/**
 * Compact question strip: at most 5 numbered chips visible; chevrons move one question
 * at a time (window slides with the selection). After scoring, chips turn green/red.
 */
export function ItemNavigator({
  items,
  currentIndex,
  onSelect,
  showCorrectness,
}: ItemNavigatorProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const total = items.length;
  const navLabel = t('assessment.session.questionNavAria');

  // Hooks must run unconditionally (even when total is 0).
  const windowStart = useMemo(() => {
    if (total <= WINDOW_SIZE) return 0;
    // Keep current near the middle of the window when possible.
    const ideal = currentIndex - Math.floor(WINDOW_SIZE / 2);
    return Math.max(0, Math.min(ideal, total - WINDOW_SIZE));
  }, [currentIndex, total]);

  if (total <= 0) return null;

  const windowEnd = Math.min(total, windowStart + WINDOW_SIZE);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - 1;

  return (
    <div className="assessment-item-nav" role="navigation" aria-label={navLabel}>
      <button
        type="button"
        className="btn-secondary assessment-nav-btn"
        onClick={() => onSelect(currentIndex - 1)}
        disabled={!canPrev}
        aria-label={t('assessment.session.previous')}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      <div className="assessment-item-nav-chips">
        {Array.from({ length: windowEnd - windowStart }, (_, offset) => {
          const index = windowStart + offset;
          const item = items[index];
          const mark = itemMarkFor(item, index, currentIndex, showCorrectness);
          const isCurrent = index === currentIndex;
          return (
            <button
              key={item?.itemId ?? index}
              type="button"
              className={`assessment-item-chip is-${mark}${isCurrent ? ' is-current' : ''}`}
              onClick={() => onSelect(index)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={t('assessment.session.questionChipAria', {
                n: index + 1,
                mark: t(`assessment.session.mark.${mark}`),
              })}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-secondary assessment-nav-btn"
        onClick={() => onSelect(currentIndex + 1)}
        disabled={!canNext}
        aria-label={t('assessment.session.next')}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
