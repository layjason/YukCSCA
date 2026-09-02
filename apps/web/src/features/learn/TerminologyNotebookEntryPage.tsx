import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  getTerminologyNotebookEntry,
  listTerminologyNotebook,
  submitTermReview,
  unbookmarkTerm,
} from '@/shared/api/terminologyStudentApi';
import { MixedProse } from '@/shared/content/MixedProse';
import { TermCardView } from '@/shared/terminology/TermCardView';
import { TermPracticeDock } from '@/shared/terminology/TermPracticeDock';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { NotebookEntryDetail, TermReviewResult } from '@/shared/terminology/types';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isExplanationLanguage, type ExplanationLanguage } from './types';
import { formatMetInLine } from './termMetIn';
import { notebookBackLabelKey, notebookReturnTo } from '@/shared/terminology/notebookReturn';
import { AskHost } from '@/features/agent';
import './learn.css';

export function TerminologyNotebookEntryPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { termId } = useParams<{ termId: string }>();
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [detail, setDetail] = useState<NotebookEntryDetail | null>(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<TermReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const audio = useTermAudio();

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

  useEffect(() => {
    setSelected('');
    setResult(null);
  }, [termId]);

  async function handleReview(): Promise<void> {
    if (!detail || !selected || busy) return;
    const prompt = detail.entry.pendingReview;
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const next = await submitTermReview(detail.entry.termId, prompt.kind, selected);
      setResult(next);
      setDetail({
        ...detail,
        entry: {
          ...next.entry,
          pendingReview: prompt,
        },
      });
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
    setBusy(true);
    setError(null);
    try {
      const list = await listTerminologyNotebook({
        explanationLanguage,
        dueOnly: true,
      });
      const next = list.items.find((item) => item.termId !== termId);
      if (next) {
        void navigate(`/app/learn/terms/${next.termId}`, { state: location.state });
        return;
      }
      void navigate('/app/learn/terms?dueOnly=1', { state: location.state });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.loadFailed'));
      }
    } finally {
      setBusy(false);
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
          <Link to="/app/learn/terms" state={location.state} className="btn-secondary">
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
  const origin = notebookReturnTo(location.state, '');

  return (
    <div className="page-content learn-page term-entry-page">
      <AskHost
        context={{ contextType: 'TERMINOLOGY', contextId: detail.card.termId }}
        hostTitle={detail.card.primarySurface.text}
      >
        <button
          type="button"
          className="learn-back-link"
          onClick={() => {
            if (origin) navigate(-1);
            else navigate('/app/learn/terms');
          }}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {origin ? t(notebookBackLabelKey(origin)) : t('terminology.notebookTitle')}
        </button>

        <TermCardView
          layout="entry"
          card={detail.card}
          alreadyInNotebook
          bookmarked
          onToggleBookmark={() => {
            if (!termId || busy) return;
            setBusy(true);
            void unbookmarkTerm(termId)
              .then(() => {
                void navigate('/app/learn/terms', { replace: true, state: location.state });
              })
              .catch((err: unknown) => {
                if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
                  setError(t('terminology.formalDisabled'));
                } else {
                  setError(t('terminology.saveFailed'));
                }
              })
              .finally(() => setBusy(false));
          }}
          bookmarkBusy={busy}
          metInLine={formatMetInLine(detail.entry.metIn, i18n.language, t)}
          onPlay={
            (detail.card.primarySurface.audioAvailable ||
              detail.card.aliases.some((alias) => alias.audioAvailable)) &&
            !audio.playFailed
              ? (surface) => {
                  void audio.play(detail.card.termId, surface);
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
            <h2 id="term-review-heading" className="term-match-title">
              {t('terminology.reviewTitle')}
            </h2>
            {prompt.kind === 'CONTEXT_CLOZE' ? (
              <MixedProse
                text={prompt.snippet}
                as="p"
                className="term-review-prompt term-cloze"
                lang="zh"
              />
            ) : (
              <p className="term-review-prompt" lang="zh">
                {prompt.promptSurface}
              </p>
            )}
            <fieldset className="term-review-choices" disabled={busy || Boolean(result)}>
              <legend className="sr-only">{t('terminology.chooseMatch')}</legend>
              {prompt.options.map((option) => {
                const isKey = result != null && option.key === result.correctOptionKey;
                const isMiss = result != null && !result.correct && option.key === selected;
                return (
                  <label
                    key={option.key}
                    className={`term-review-choice${isKey ? ' is-key' : ''}${isMiss ? ' is-miss' : ''}`}
                  >
                    <input
                      type="radio"
                      name="term-review"
                      value={option.key}
                      checked={selected === option.key}
                      onChange={() => setSelected(option.key)}
                    />
                    <MixedProse text={option.label} as="span" />
                  </label>
                );
              })}
            </fieldset>
            {result ? (
              <TermPracticeDock
                tone={result.correct ? 'correct' : 'incorrect'}
                idleLabel={t('terminology.reviewSubmit')}
                title={
                  result.correct
                    ? t('terminology.pairsNicelyDone')
                    : t('terminology.reviewIncorrect')
                }
                actionLabel={t('terminology.pairsContinue')}
                onAction={() => {
                  void handleNextDue();
                }}
                busy={busy}
              />
            ) : (
              <TermPracticeDock
                tone="idle"
                idleLabel={t('terminology.reviewSubmit')}
                actionDisabled={!selected}
                busy={busy}
                onAction={() => {
                  void handleReview();
                }}
              />
            )}
          </section>
        ) : null}
      </AskHost>
    </div>
  );
}

export default TerminologyNotebookEntryPage;
