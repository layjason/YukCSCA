import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenText } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import {
  bookmarkTerm,
  resolveTermLookup,
  unbookmarkTerm,
} from '@/shared/api/terminologyStudentApi';
import { TermGlossBubble } from '@/shared/terminology/TermGlossBubble';
import { uniqueSpansByTermId } from '@/shared/terminology/termPresentation';
import type { TappableSpan } from '@/shared/terminology/TappableText';
import type { TermCard, TermLookupRequest } from '@/shared/terminology/types';
import type {
  AcademicSubject,
  ExplanationLanguage,
  LanguageHelpTrigger,
  SessionItemView,
} from '../types';
import type { AssessmentTermSpan } from './AssessmentBlocks';

export interface LanguageHelpStemProps {
  spans: readonly AssessmentTermSpan[];
  onActivate: (span: TappableSpan, target: HTMLElement) => void;
  onHoverEnd: (span: TappableSpan) => void;
  disabled: boolean;
}

interface LanguageHelpPanelProps {
  item: SessionItemView;
  subject: AcademicSubject;
  sessionId: string;
  explanationLanguage: ExplanationLanguage;
  lookupSource?: Extract<TermLookupRequest['source'], 'ITEM' | 'LANGUAGE_MISTAKE'>;
  canDisclose?: boolean;
  /** When false, the parent chrome owns the “stuck on a word?” control. */
  showAskControl?: boolean;
  busy: boolean;
  onDisclose: (trigger: LanguageHelpTrigger) => Promise<void>;
  renderStem?: (help: LanguageHelpStemProps) => React.ReactNode;
}

export function LanguageHelpAskControl({
  busy,
  disabled,
  onClick,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const label = busy ? t('assessment.languageHelp.opening') : t('assessment.languageHelp.ask');
  return (
    <button
      type="button"
      className="language-help-ask"
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <BookOpenText size={18} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function LanguageHelpPanel({
  item,
  subject,
  sessionId,
  explanationLanguage,
  lookupSource = 'ITEM',
  canDisclose = true,
  showAskControl = true,
  busy,
  onDisclose,
  renderStem,
}: LanguageHelpPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [cards, setCards] = useState<Record<string, TermCard>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<{
    span: TappableSpan;
    target: HTMLElement;
    restoreFocus: boolean;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [notInBank, setNotInBank] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const hideTimer = useRef<number>(0);
  const available = Boolean(item.languageHelpAvailable || item.languageHelp);

  const disclosed = item.languageHelp?.disclosed === true;

  const rawSpans = item.languageHelp?.spans ?? [];
  const stemSpans: AssessmentTermSpan[] = disclosed
    ? rawSpans.map((span) => ({
        termId: span.termId,
        surfaceForm: span.surfaceForm,
        blockIndex: span.blockIndex,
        startOffset: span.startOffset,
        endOffset: span.endOffset,
      }))
    : [];
  const phrases = uniqueSpansByTermId(rawSpans);

  function cancelHide(): void {
    window.clearTimeout(hideTimer.current);
  }

  function scheduleHide(): void {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setActive(null), 220);
  }

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  useEffect(() => {
    if (!active) return;
    const target = active.target;
    function onDoc(event: PointerEvent): void {
      const node = event.target as Node | null;
      if (!node) return;
      if (target.contains(node)) return;
      const glossEl = document.querySelector('.term-gloss');
      if (glossEl?.contains(node)) return;
      setActive(null);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [active]);

  async function loadCard(termId?: string, selectedText?: string): Promise<TermCard | null> {
    setLookupError(null);
    setNotInBank(false);
    try {
      const result = await resolveTermLookup({
        subject,
        explanationLanguage,
        source: lookupSource,
        sessionId,
        itemId: item.itemId,
        ...(termId ? { termId } : {}),
        ...(selectedText ? { selectedText } : {}),
      });
      if (result.outcome === 'NOT_IN_BANK') {
        setNotInBank(true);
        setActive(null);
        return null;
      }
      setCards((current) => ({ ...current, [result.card.termId]: result.card }));
      setBookmarked((current) => ({
        ...current,
        [result.card.termId]: result.alreadyInNotebook,
      }));
      return result.card;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setLookupError(t('terminology.formalDisabled'));
      } else {
        setLookupError(t('terminology.lookupFailed'));
      }
      return null;
    }
  }

  function handleChip(span: TappableSpan, target: HTMLElement): void {
    cancelHide();
    const fromHelp = rawSpans.find((itemSpan) => itemSpan.termId === span.termId);
    if (fromHelp && bookmarked[span.termId] === undefined) {
      setBookmarked((current) => ({
        ...current,
        [span.termId]: fromHelp.alreadyInNotebook,
      }));
    }
    setActive({
      span,
      target,
      restoreFocus: target === document.activeElement || target.contains(document.activeElement),
    });
    if (!cards[span.termId]) {
      void loadCard(span.termId);
    }
  }

  async function handleToggleBookmark(termId: string): Promise<void> {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    setLookupError(null);
    try {
      if (bookmarked[termId]) {
        await unbookmarkTerm(termId);
        setBookmarked((current) => ({ ...current, [termId]: false }));
        setCards((current) =>
          current[termId]
            ? { ...current, [termId]: { ...current[termId]!, alreadyInNotebook: false } }
            : current,
        );
        setToast({ message: t('terminology.unbookmarkedToast'), tone: 'info' });
      } else {
        const result = await bookmarkTerm(termId, {
          subject,
          explanationLanguage,
          source: lookupSource,
          sessionId,
          itemId: item.itemId,
        });
        setBookmarked((current) => ({ ...current, [termId]: true }));
        setCards((current) => ({ ...current, [termId]: result.card }));
        setToast({ message: t('terminology.bookmarkedToast'), tone: 'success' });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setLookupError(t('terminology.formalDisabled'));
      } else {
        setLookupError(t('terminology.saveFailed'));
      }
    } finally {
      setBookmarkBusy(false);
    }
  }

  const gloss = active;
  const activeCard = gloss ? cards[gloss.span.termId] : null;

  if (!available) {
    return null;
  }

  return (
    <>
      {renderStem ? (
        <div lang="zh">
          {renderStem({
            spans: stemSpans,
            onActivate: handleChip,
            onHoverEnd: scheduleHide,
            disabled: busy,
          })}
        </div>
      ) : null}

      {!disclosed && canDisclose && showAskControl ? (
        <LanguageHelpAskControl busy={busy} onClick={() => void onDisclose('STUDENT_REQUEST')} />
      ) : null}

      {disclosed && phrases.length === 0 ? (
        <p className="language-help-hint">{t('assessment.languageHelp.emptySpans')}</p>
      ) : null}

      {notInBank ? <p role="status">{t('terminology.notInBank')}</p> : null}
      {lookupError ? <p role="alert">{lookupError}</p> : null}

      {gloss && activeCard ? (
        <TermGlossBubble
          card={activeCard}
          surfaceForm={gloss.span.surfaceForm}
          anchor={gloss.target}
          bookmarked={bookmarked[gloss.span.termId] === true}
          bookmarkBusy={bookmarkBusy}
          onToggleBookmark={() => void handleToggleBookmark(gloss.span.termId)}
          onDismiss={() => setActive(null)}
          restoreFocus={gloss.restoreFocus}
          onHoverStay={cancelHide}
          onHoverLeave={scheduleHide}
        />
      ) : null}
      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </>
  );
}
