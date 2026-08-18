import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  getTerminologyNotebookEntry,
  listTerminologyNotebook,
  submitTermReview,
} from '@/shared/api/terminologyStudentApi';
import { TermCardView } from '@/shared/terminology/TermCardView';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { NotebookEntryDetail, TermReviewResult } from '@/shared/terminology/types';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isExplanationLanguage, type ExplanationLanguage } from './types';
import { formatMetInLine } from './termMetIn';
import './learn.css';

export function TerminologyNotebookEntryPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { termId } = useParams<{ termId: string }>();
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [detail, setDetail] = useState<NotebookEntryDetail | null>(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<TermReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const audio = useTermAudio(termId ?? null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        setExplanationLanguage(
          isExplanationLanguage(profile.defaultExplanationLanguage)
            ? profile.defaultExplanationLanguage
            : 'id',
        );
      })
      .catch(() => {
        if (active) setExplanationLanguage('id');
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!termId || !explanationLanguage) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);
    setSelected('');
    try {
      const data = await getTerminologyNotebookEntry(termId, explanationLanguage);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(t('terminology.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [explanationLanguage, t, termId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReview(): Promise<void> {
    if (!detail || !selected || busy) return;
    const prompt = detail.entry.pendingReview;
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const next = await submitTermReview(detail.entry.termId, prompt.kind, selected);
      setResult(next);
      setDetail({ ...detail, entry: next.entry });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.saveFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleNextDue(): Promise<void> {
    if (!explanationLanguage) return;
    const list = await listTerminologyNotebook({
      explanationLanguage,
      dueOnly: true,
    });
    const next = list.items.find((item) => item.termId !== termId) ?? list.items[0];
    if (next) {
      void navigate(`/app/learn/terms/${next.termId}`);
    } else {
      void navigate('/app/learn/terms?dueOnly=1');
    }
  }

  if (!termId) {
    return (
      <div className="page-content learn-page">
        <p>{t('terminology.entryNotFoundDescription')}</p>
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className="page-content learn-page" aria-busy="true">
        <p>{t('learn.loading')}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content learn-page">
        <section className="empty-state state-notice state-notice-info" role="status">
          <h1>{t('terminology.entryNotFoundTitle')}</h1>
          <p>{t('terminology.entryNotFoundDescription')}</p>
          <Link to="/app/learn/terms" className="btn-secondary">
            {t('terminology.notebookTitle')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="page-content learn-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page-content learn-page">
        <p>{t('learn.loading')}</p>
      </div>
    );
  }

  const prompt = detail.entry.pendingReview;

  return (
    <div className="page-content learn-page">
      <Link to="/app/learn/terms" className="learn-back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('terminology.notebookTitle')}
      </Link>

      <TermCardView
        card={detail.card}
        alreadyInNotebook
        metInLine={formatMetInLine(detail.entry.metIn, i18n.language, t)}
        onPlay={
          detail.card.primarySurface.audioAvailable && !audio.playFailed
            ? (surface) => {
                void audio.play(surface);
              }
            : undefined
        }
        playingSurface={audio.playingSurface}
        playFailed={audio.playFailed}
      />

      {error ? (
        <div className="assessment-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      {prompt ? (
        <section className="term-review" aria-labelledby="term-review-heading">
          <h2 id="term-review-heading">{t('terminology.reviewTitle')}</h2>
          {prompt.kind === 'CONTEXT_CLOZE' ? (
            <p className="term-cloze" lang="zh">
              {prompt.snippet}
            </p>
          ) : (
            <p lang="zh">{prompt.promptSurface}</p>
          )}
          <fieldset className="term-review-options" disabled={busy || Boolean(result)}>
            <legend className="sr-only">{t('terminology.chooseMatch')}</legend>
            {prompt.options.map((option) => (
              <label key={option.key} className="term-review-option">
                <input
                  type="radio"
                  name="term-review"
                  value={option.key}
                  checked={selected === option.key}
                  onChange={() => setSelected(option.key)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          {!result ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!selected || busy}
              onClick={() => void handleReview()}
            >
              {t('terminology.reviewSubmit')}
            </button>
          ) : (
            <div role="status">
              <p>
                {result.correct ? t('terminology.reviewCorrect') : t('terminology.reviewIncorrect')}
              </p>
              <button type="button" className="btn-primary" onClick={() => void handleNextDue()}>
                {t('terminology.nextDue')}
              </button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default TerminologyNotebookEntryPage;
