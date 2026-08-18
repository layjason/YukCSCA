import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, NotebookText } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  getTerminologyPreview,
  submitPreviewCheck,
  upsertPreviewProgress,
} from '@/shared/api/terminologyStudentApi';
import { TermCardView } from '@/shared/terminology/TermCardView';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { PreviewCheckResult, TerminologyPreview } from '@/shared/terminology/types';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isAcademicSubject, isExplanationLanguage, type ExplanationLanguage } from './types';
import { lessonHref } from './previewNavigation';
import { resolveLocalizedText } from './localizedText';
import './learn.css';

export function TerminologyPreviewPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const [searchParams] = useSearchParams();
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;
  const preferredLessonId = searchParams.get('lessonResourceId');

  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [preview, setPreview] = useState<TerminologyPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pairsOpen, setPairsOpen] = useState(false);
  const [pairChoices, setPairChoices] = useState<Record<string, string>>({});
  const [checkResult, setCheckResult] = useState<PreviewCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [playingTermId, setPlayingTermId] = useState<string | null>(null);
  const audio = useTermAudio(playingTermId);

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
    if (!subject || !resourceId || !explanationLanguage) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getTerminologyPreview(subject, resourceId, explanationLanguage);
      setPreview(data);
      if (data.previewProgress.status === 'NOT_STARTED') {
        const next = await upsertPreviewProgress(
          subject,
          resourceId,
          'IN_PROGRESS',
          data.packageRevisionId,
        );
        setPreview({ ...data, previewProgress: next });
      }
    } catch (err) {
      setPreview(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, resourceId, explanationLanguage, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const lessonTarget = useMemo(() => {
    if (!preview) return null;
    if (preferredLessonId && preview.lessonResourceIds.includes(preferredLessonId)) {
      return preferredLessonId;
    }
    return preview.lessonResourceIds[0] ?? null;
  }, [preview, preferredLessonId]);

  async function handleContinue(): Promise<void> {
    if (!subject || !resourceId || !preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (preview.previewProgress.status !== 'PREVIEW_COMPLETE') {
        const next = await upsertPreviewProgress(
          subject,
          resourceId,
          'PREVIEW_COMPLETE',
          preview.packageRevisionId,
        );
        setPreview({ ...preview, previewProgress: next });
        setToast({ message: t('terminology.previewComplete'), tone: 'success' });
      }
      if (lessonTarget) {
        void navigate(lessonHref(subject, lessonTarget));
      } else {
        void navigate(`/app/learn/${subject}`);
      }
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

  async function handleCheck(): Promise<void> {
    if (!subject || !resourceId || !preview || busy) return;
    const pairs = preview.matchTargets.map((target) => ({
      termId: target.termId,
      selectedMatchKey: pairChoices[target.termId] ?? '',
    }));
    if (pairs.some((pair) => !pair.selectedMatchKey)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitPreviewCheck(subject, resourceId, pairs);
      setCheckResult(result);
      setPreview({ ...preview, previewProgress: result.previewProgress });
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

  if (!subject || !resourceId) {
    return (
      <div className="page-content learn-page">
        <section className="state-notice state-notice-error" role="alert">
          <h1>{t('terminology.notFoundTitle')}</h1>
          <Link to="/app/learn" className="btn-secondary">
            {t('learn.backToLearn')}
          </Link>
        </section>
      </div>
    );
  }

  if (loading && !preview) {
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
          <h1>{t('terminology.notFoundTitle')}</h1>
          <p>{t('terminology.notFoundDescription')}</p>
          <Link to={`/app/learn/${subject}`} className="btn-secondary">
            {t('learn.backToBrowse')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="page-content learn-page">
        <section className="state-notice state-notice-error" role="alert">
          <h1>{t('learn.errors.title')}</h1>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="page-content learn-page">
        <p>{t('learn.loading')}</p>
      </div>
    );
  }

  const title = resolveLocalizedText(preview.title, i18n.language) || t('terminology.previewTitle');

  return (
    <div className="page-content learn-page terminology-preview-page">
      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}

      <header className="learn-reader-chrome">
        <div className="learn-reader-chrome-row">
          <Link to={`/app/learn/${subject}`} className="learn-back-link">
            <ArrowLeft size={18} aria-hidden="true" />
            {t('learn.backToBrowse')}
          </Link>
          <Link to="/app/learn/terms" className="learn-back-link">
            <NotebookText size={18} aria-hidden="true" />
            {t('learn.openNotebook')}
          </Link>
        </div>
        <h1>{title}</h1>
        <p className="learn-lede">{t('terminology.previewLead')}</p>
      </header>

      {preview.previewProgress.requiredSetUpdatedSinceCompleted ? (
        <p className="learn-update-banner" role="status">
          {t('terminology.requiredSetUpdated')}
        </p>
      ) : null}

      {error ? (
        <div className="assessment-inline-error" role="alert">
          {error}
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </div>
      ) : null}

      <ol className="term-preview-list">
        {preview.terms.map((card) => (
          <li key={card.termId}>
            <TermCardView
              card={card}
              onPlay={
                (card.primarySurface.audioAvailable ||
                  card.aliases.some((alias) => alias.audioAvailable)) &&
                !(audio.playFailed && playingTermId === card.termId)
                  ? (surface) => {
                      setPlayingTermId(card.termId);
                      void audio.play(surface);
                    }
                  : undefined
              }
              playingSurface={playingTermId === card.termId ? audio.playingSurface : null}
              playFailed={audio.playFailed && playingTermId === card.termId}
            />
          </li>
        ))}
      </ol>

      {preview.matchingPairsAvailable && !pairsOpen ? (
        <button type="button" className="btn-secondary" onClick={() => setPairsOpen(true)}>
          {t('terminology.practicePairs')}
        </button>
      ) : null}

      {pairsOpen && preview.matchingPairsAvailable ? (
        <section className="term-pairs" aria-labelledby="term-pairs-heading">
          <h2 id="term-pairs-heading">{t('terminology.pairsTitle')}</h2>
          <ul className="term-pairs-list">
            {preview.matchTargets.map((target) => {
              const selected = pairChoices[target.termId] ?? '';
              const localCorrect = checkResult ? selected === target.matchKey : null;
              return (
                <li key={target.termId} className="term-pair-row">
                  <span lang="zh" className="term-pair-prompt">
                    {target.promptSurface}
                  </span>
                  <label className="term-pair-label">
                    <span className="sr-only">{t('terminology.pairsPrompt')}</span>
                    <select
                      value={selected}
                      onChange={(event) =>
                        setPairChoices((current) => ({
                          ...current,
                          [target.termId]: event.target.value,
                        }))
                      }
                      disabled={busy}
                    >
                      <option value="">{t('terminology.chooseMatch')}</option>
                      {preview.matchTargets.map((option) => (
                        <option key={option.matchKey} value={option.matchKey}>
                          {option.matchLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  {localCorrect === true ? (
                    <span className="term-pair-mark is-correct">
                      {t('assessment.session.mark.correct')}
                    </span>
                  ) : null}
                  {localCorrect === false ? (
                    <span className="term-pair-mark is-incorrect">
                      {t('assessment.session.mark.incorrect')}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || preview.matchTargets.some((target) => !pairChoices[target.termId])}
            onClick={() => void handleCheck()}
          >
            {t('terminology.pairsSubmit')}
          </button>
          {checkResult ? (
            <p role="status">
              {t('terminology.pairsResult', {
                correct: checkResult.correctCount,
                total: checkResult.totalCount,
              })}
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="learn-reader-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => void handleContinue()}
        >
          {t('terminology.continueToLesson')}
        </button>
      </footer>
    </div>
  );
}

export default TerminologyPreviewPage;
