import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { NotebookText } from 'lucide-react';
import { resolveTermLookup } from '@/shared/api/terminologyStudentApi';
import { TermCardDialog } from '@/shared/terminology/TermCardDialog';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { TermCard } from '@/shared/terminology/types';
import { ApiError } from '@/shared/api/httpClient';
import type { AcademicSubject, ExplanationLanguage } from '../types';
import { formatMetInLine } from '../termMetIn';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';

interface LessonTermRailProps {
  subject: AcademicSubject;
  resourceId: string;
  explanationLanguage: ExplanationLanguage;
  rail: readonly TermCard[];
}

export function LessonTermRail({
  subject,
  resourceId,
  explanationLanguage,
  rail,
}: LessonTermRailProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState<TermCard | null>(null);
  const [already, setAlready] = useState(false);
  const [metInLine, setMetInLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useTermAudio();

  async function openTerm(card: TermCard): Promise<void> {
    setError(null);
    try {
      const result = await resolveTermLookup({
        subject,
        explanationLanguage,
        source: 'LESSON',
        termId: card.termId,
        resourceId,
      });
      if (result.outcome === 'MATCHED') {
        setOpen(result.card);
        setAlready(result.alreadyInNotebook);
        setMetInLine(formatMetInLine(result.entry.metIn, i18n.language, t));
      } else {
        setError(t('terminology.notInBank'));
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.lookupFailed'));
      }
    }
  }

  return (
    <aside className="term-rail" aria-labelledby="term-rail-heading">
      <div className="term-rail-header">
        <h2 id="term-rail-heading">{t('terminology.railTitle')}</h2>
        <Link
          to="/app/learn/terms"
          state={notebookStateFrom(`${location.pathname}${location.search}`)}
          className="learn-back-link"
        >
          <NotebookText size={16} aria-hidden="true" />
          {t('learn.openNotebook')}
        </Link>
      </div>
      {rail.length === 0 ? (
        <p className="admin-muted">{t('terminology.railEmpty')}</p>
      ) : (
        <ul className="term-rail-list">
          {rail.map((card) => (
            <li key={card.termId}>
              <button type="button" className="term-rail-item" onClick={() => void openTerm(card)}>
                <span lang="zh">{card.primarySurface.text}</span>
                <span className="term-card-pinyin" aria-hidden="true">
                  {card.primarySurface.pinyin}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p role="alert">{error}</p> : null}
      {open ? (
        <TermCardDialog
          card={open}
          alreadyInNotebook={already}
          metInLine={metInLine}
          onClose={() => setOpen(null)}
          onPlay={
            open.primarySurface.audioAvailable && !audio.playFailed
              ? (surface) => {
                  void audio.play(open.termId, surface);
                }
              : undefined
          }
          playingSurface={audio.playingSurface}
          playFailed={audio.playFailed}
        />
      ) : null}
    </aside>
  );
}
