import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenText } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { resolveTermLookup } from '@/shared/api/terminologyStudentApi';
import { TermCardDialog } from '@/shared/terminology/TermCardDialog';
import { selectedLookupText, uniqueSpansByTermId } from '@/shared/terminology/termPresentation';
import type { TappableSpan } from '@/shared/terminology/TappableText';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { TermCard, TermLookupRequest } from '@/shared/terminology/types';
import type {
  AcademicSubject,
  ExplanationLanguage,
  LanguageHelpTrigger,
  SessionItemView,
} from '../types';
import { formatMetInLine } from '@/shared/terminology/termMetIn';
import type { AssessmentTermSpan } from './AssessmentBlocks';

export interface LanguageHelpStemProps {
  spans: readonly AssessmentTermSpan[];
  onActivate: (span: TappableSpan) => void;
  disabled: boolean;
}

interface LanguageHelpPanelProps {
  item: SessionItemView;
  subject: AcademicSubject;
  sessionId: string;
  explanationLanguage: ExplanationLanguage;
  lookupSource?: Extract<TermLookupRequest['source'], 'ITEM' | 'LANGUAGE_MISTAKE'>;
  canDisclose?: boolean;
  busy: boolean;
  onDisclose: (trigger: LanguageHelpTrigger) => Promise<void>;
  renderStem?: (help: LanguageHelpStemProps) => React.ReactNode;
}

export function LanguageHelpPanel({
  item,
  subject,
  sessionId,
  explanationLanguage,
  lookupSource = 'ITEM',
  canDisclose = true,
  busy,
  onDisclose,
  renderStem,
}: LanguageHelpPanelProps): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const [openCard, setOpenCard] = useState<TermCard | null>(null);
  const [already, setAlready] = useState(false);
  const [metInLine, setMetInLine] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [notInBank, setNotInBank] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const audio = useTermAudio();

  if (!item.languageHelpAvailable && !item.languageHelp) {
    return null;
  }

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

  async function lookup(termId?: string, selectedText?: string): Promise<void> {
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

  const openLabel = busy ? t('assessment.languageHelp.opening') : t('assessment.languageHelp.open');

  return (
    <>
      {renderStem ? (
        <div lang="zh">
          {renderStem({
            spans: stemSpans,
            onActivate: handleChip,
            disabled: busy,
          })}
        </div>
      ) : null}

      {(!disclosed && canDisclose) || disclosed || notInBank || lookupError ? (
        <section
          className={disclosed ? 'language-help-panel' : 'language-help-idle'}
          aria-label={t('assessment.languageHelp.regionLabel')}
        >
          {!disclosed && canDisclose ? (
            <button
              type="button"
              className="language-help-icon"
              disabled={busy}
              aria-label={openLabel}
              title={openLabel}
              onClick={() => void onDisclose('STUDENT_REQUEST')}
            >
              <BookOpenText size={20} aria-hidden="true" />
            </button>
          ) : null}

          {disclosed ? (
            <div className="language-help-phrases">
              <p className="language-help-phrases-kicker">
                {t('assessment.languageHelp.keyPhrases')}
              </p>
              {phrases.length === 0 ? (
                <p className="language-help-hint">{t('assessment.languageHelp.emptySpans')}</p>
              ) : (
                <ul className="language-help-phrase-list">
                  {phrases.map((phrase) => (
                    <li key={phrase.termId}>
                      <button
                        type="button"
                        className="language-help-phrase"
                        disabled={busy}
                        onClick={() => void lookup(phrase.termId)}
                      >
                        <span lang="zh" className="language-help-phrase-text">
                          {phrase.surfaceForm}
                        </span>
                        <span className="language-help-phrase-leader" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <details
                className="language-help-lookup"
                open={lookupOpen}
                onToggle={(event) => setLookupOpen(event.currentTarget.open)}
              >
                <summary>{t('assessment.languageHelp.lookUpOther')}</summary>
                <button type="button" className="btn-secondary" onClick={handleSelectionLookup}>
                  {t('terminology.lookUpSelection')}
                </button>
              </details>
            </div>
          ) : null}

          {notInBank ? <p role="status">{t('terminology.notInBank')}</p> : null}
          {lookupError ? <p role="alert">{lookupError}</p> : null}
        </section>
      ) : null}

      {openCard ? (
        <TermCardDialog
          card={openCard}
          alreadyInNotebook={already}
          metInLine={metInLine}
          onClose={() => setOpenCard(null)}
          onPlay={
            openCard.primarySurface.audioAvailable && !audio.playFailed
              ? (surface) => {
                  void audio.play(openCard.termId, surface);
                }
              : undefined
          }
          playingSurface={audio.playingSurface}
          playFailed={audio.playFailed}
        />
      ) : null}
    </>
  );
}
