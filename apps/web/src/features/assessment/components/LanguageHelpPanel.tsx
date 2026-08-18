import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenText, NotebookText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/shared/api/httpClient';
import { resolveTermLookup } from '@/shared/api/terminologyStudentApi';
import { TermCardDialog } from '@/shared/terminology/TermCardDialog';
import { selectedLookupText } from '@/shared/terminology/termPresentation';
import { TappableText, type TappableSpan } from '@/shared/terminology/TappableText';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { TermCard } from '@/shared/terminology/types';
import type {
  AcademicSubject,
  ExplanationLanguage,
  LanguageHelpTrigger,
  SessionItemView,
} from '../types';
import { formatMetInLine } from '@/shared/terminology/termMetIn';
import { AssessmentBlocks } from './AssessmentBlocks';

interface LanguageHelpPanelProps {
  item: SessionItemView;
  subject: AcademicSubject;
  sessionId: string;
  explanationLanguage: ExplanationLanguage;
  busy: boolean;
  onDisclose: (trigger: LanguageHelpTrigger) => Promise<void>;
}

export function LanguageHelpPanel({
  item,
  subject,
  sessionId,
  explanationLanguage,
  busy,
  onDisclose,
}: LanguageHelpPanelProps): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const [openCard, setOpenCard] = useState<TermCard | null>(null);
  const [already, setAlready] = useState(false);
  const [metInLine, setMetInLine] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [notInBank, setNotInBank] = useState(false);
  const audio = useTermAudio(openCard?.termId ?? null);

  if (!item.languageHelpAvailable && !item.languageHelp) {
    return null;
  }

  const disclosed = item.languageHelp?.disclosed === true;

  async function lookup(termId?: string, selectedText?: string): Promise<void> {
    setLookupError(null);
    setNotInBank(false);
    try {
      const result = await resolveTermLookup({
        subject,
        explanationLanguage,
        source: 'ITEM',
        sessionId,
        itemId: item.itemId,
        ...(termId ? { termId } : {}),
        ...(selectedText ? { selectedText } : {}),
      });
      if (result.outcome === 'NOT_IN_BANK') {
        setNotInBank(true);
        setOpenCard(null);
        return;
      }
      setOpenCard(result.card);
      setAlready(result.alreadyInNotebook);
      setMetInLine(formatMetInLine(result.entry.metIn, i18n.language, t));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setLookupError(t('terminology.formalDisabled'));
      } else {
        setLookupError(t('terminology.lookupFailed'));
      }
    }
  }

  function handleChip(span: TappableSpan): void {
    void lookup(span.termId);
  }

  function handleSelectionLookup(): void {
    const raw = window.getSelection()?.toString() ?? '';
    const text = selectedLookupText(raw);
    if (!text) return;
    void lookup(undefined, text);
  }

  return (
    <section className="language-help-panel" aria-label={t('assessment.languageHelp.regionLabel')}>
      {!disclosed ? (
        <button
          type="button"
          className="btn-secondary language-help-open"
          disabled={busy}
          onClick={() => void onDisclose('STUDENT_REQUEST')}
        >
          <BookOpenText size={16} aria-hidden="true" />
          {busy ? t('assessment.languageHelp.opening') : t('assessment.languageHelp.open')}
        </button>
      ) : (
        <>
          <div className="language-help-stem">
            {item.stem.map((block, index) => {
              if (block.kind !== 'TEXT') {
                return <AssessmentBlocks key={`stem-${index}`} blocks={[block]} />;
              }
              const spans = (item.languageHelp?.spans ?? [])
                .filter((span) => span.blockIndex === index)
                .map((span) => ({
                  termId: span.termId,
                  surfaceForm: span.surfaceForm,
                  startOffset: span.startOffset,
                  endOffset: span.endOffset,
                }));
              return (
                <TappableText
                  key={`stem-text-${index}`}
                  text={block.text}
                  spans={spans}
                  onActivate={handleChip}
                  disabled={busy}
                />
              );
            })}
          </div>
          <p className="language-help-hint">{t('terminology.selectHint')}</p>
          <div className="language-help-actions">
            <button type="button" className="btn-secondary" onClick={handleSelectionLookup}>
              {t('terminology.lookUpSelection')}
            </button>
            <Link to="/app/learn/terms" className="learn-back-link">
              <NotebookText size={16} aria-hidden="true" />
              {t('assessment.languageHelp.openNotebook')}
            </Link>
          </div>
        </>
      )}

      {notInBank ? <p role="status">{t('terminology.notInBank')}</p> : null}
      {lookupError ? <p role="alert">{lookupError}</p> : null}

      {openCard ? (
        <TermCardDialog
          card={openCard}
          alreadyInNotebook={already}
          metInLine={metInLine}
          onClose={() => setOpenCard(null)}
          onPlay={
            openCard.primarySurface.audioAvailable && !audio.playFailed
              ? (surface) => {
                  void audio.play(surface);
                }
              : undefined
          }
          playingSurface={audio.playingSurface}
          playFailed={audio.playFailed}
        />
      ) : null}
    </section>
  );
}
