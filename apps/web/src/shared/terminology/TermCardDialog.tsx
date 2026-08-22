import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { TermBookmarkIcon } from './TermBookmarkIcon';
import { TermCardView } from './TermCardView';
import type { TermCard } from './types';

const OVERLAY_CLASS = 'app-term-overlay-open';

interface TermCardDialogProps {
  card: TermCard;
  alreadyInNotebook?: boolean | undefined;
  metInLine?: string | null | undefined;
  onClose: () => void;
  onPlay?: ((surfaceText: string) => void) | undefined;
  playingSurface?: string | null | undefined;
  playDisabled?: boolean | undefined;
  playFailed?: boolean | undefined;
  extra?: React.ReactNode | undefined;
  bookmarked?: boolean | undefined;
  onToggleBookmark?: (() => void) | undefined;
  bookmarkBusy?: boolean | undefined;
}

export function TermCardDialog({
  card,
  alreadyInNotebook,
  metInLine,
  onClose,
  onPlay,
  playingSurface,
  playDisabled,
  playFailed,
  extra,
  bookmarked = false,
  onToggleBookmark,
  bookmarkBusy = false,
}: TermCardDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const bookmarkLabel = bookmarked
    ? t('terminology.unbookmarkAria', { text: card.primarySurface.text })
    : t('terminology.bookmarkAria', { text: card.primarySurface.text });

  useEffect(() => {
    document.body.classList.add(OVERLAY_CLASS);
    return () => {
      document.body.classList.remove(OVERLAY_CLASS);
    };
  }, []);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();
    function focusable(): HTMLElement[] {
      const root = dialogRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreRef.current instanceof HTMLElement) {
        restoreRef.current.focus();
      }
    };
  }, [onClose]);

  return createPortal(
    <div className="term-dialog-scrim" onClick={onClose}>
      <div
        className="term-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-dialog-title"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="term-sheet-handle" aria-hidden="true" />
        <div className="term-dialog-actions">
          {onToggleBookmark ? (
            <button
              type="button"
              className={`term-card-bookmark${bookmarked ? ' is-on' : ''}`}
              aria-pressed={bookmarked}
              aria-label={bookmarkLabel}
              title={bookmarkLabel}
              disabled={bookmarkBusy}
              onClick={onToggleBookmark}
            >
              <TermBookmarkIcon marked={bookmarked} size={22} />
            </button>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            className="term-dialog-close"
            onClick={onClose}
            aria-label={t('terminology.close')}
            title={t('terminology.close')}
          >
            <X size={22} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <h2 id="term-dialog-title" className="sr-only">
          {card.primarySurface.text}
        </h2>
        <TermCardView
          card={card}
          alreadyInNotebook={alreadyInNotebook}
          metInLine={metInLine}
          onPlay={onPlay}
          playingSurface={playingSurface}
          playDisabled={playDisabled}
          playFailed={playFailed}
          bookmarked={bookmarked}
          hideSavedNote={Boolean(onToggleBookmark)}
        />
        {extra}
      </div>
    </div>,
    document.body,
  );
}
