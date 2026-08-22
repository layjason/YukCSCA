import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MixedProse } from '@/shared/content/MixedProse';
import { TermBookmarkIcon } from './TermBookmarkIcon';
import { termDefinitionText } from './termPresentation';
import type { TermCard } from './types';

interface TermGlossBubbleProps {
  card: TermCard;
  surfaceForm: string;
  anchor: HTMLElement;
  bookmarked: boolean;
  bookmarkBusy?: boolean;
  onToggleBookmark: () => void;
  onDismiss: () => void;
  restoreFocus?: boolean;
  onHoverStay: () => void;
  onHoverLeave: () => void;
}

export function TermGlossBubble({
  card,
  surfaceForm,
  anchor,
  bookmarked,
  bookmarkBusy = false,
  onToggleBookmark,
  onDismiss,
  restoreFocus = false,
  onHoverStay,
  onHoverLeave,
}: TermGlossBubbleProps): React.JSX.Element {
  const { t } = useTranslation();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const unavailable = t('terminology.definitionUnavailable');
  const gloss = termDefinitionText(card.definition, unavailable);
  const rect = anchor.getBoundingClientRect();
  const bookmarkLabel = bookmarked
    ? t('terminology.unbookmarkAria', { text: surfaceForm })
    : t('terminology.bookmarkAria', { text: surfaceForm });
  useEffect(() => {
    if (restoreFocus) {
      bubbleRef.current?.focus();
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onDismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreFocus) {
        anchor.focus();
      }
    };
  }, [anchor, card.termId, onDismiss, restoreFocus, surfaceForm]);

  return createPortal(
    <div
      ref={bubbleRef}
      className="term-gloss"
      role="dialog"
      aria-modal="false"
      aria-label={t('terminology.glossLabel', { text: surfaceForm })}
      tabIndex={-1}
      style={{
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 280)),
        top: Math.max(12, rect.top - 8),
      }}
      onPointerEnter={onHoverStay}
      onPointerLeave={onHoverLeave}
    >
      <div className="term-gloss-meaning">
        {card.definition.availability === 'LANGUAGE_UNAVAILABLE' ? (
          <p className="term-gloss-text term-card-unavailable" role="status">
            {t('terminology.definitionUnavailableDetail', {
              language: t(`studentActivation.languages.${card.definition.requestedLanguage}`),
            })}
          </p>
        ) : (
          <MixedProse text={gloss} as="p" className="term-gloss-text" />
        )}
        <button
          type="button"
          className={`term-gloss-bookmark${bookmarked ? ' is-on' : ''}`}
          aria-pressed={bookmarked}
          aria-label={bookmarkLabel}
          title={bookmarkLabel}
          disabled={bookmarkBusy}
          onClick={onToggleBookmark}
        >
          <TermBookmarkIcon marked={bookmarked} size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
