import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, NotebookText } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  bookmarkLessonTerms,
  bookmarkTerm,
  getTerminologyPreview,
  submitPreviewCheck,
  unbookmarkTerm,
  upsertPreviewProgress,
} from '@/shared/api/terminologyStudentApi';
import { TermCardView } from '@/shared/terminology/TermCardView';
import { TermMatchBoard } from '@/shared/terminology/TermMatchBoard';
import { TermPracticeLaunch } from '@/shared/terminology/TermPracticeLaunch';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import type { TerminologyPreview } from '@/shared/terminology/types';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isAcademicSubject, isExplanationLanguage, type ExplanationLanguage } from './types';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';
import { lessonHref } from './previewNavigation';
import { resolveLocalizedText } from './localizedText';
import { AskHost } from '@/features/agent';
import './learn.css';

export function TerminologyPreviewPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
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
    if (!subject || !resourceId || !explanationLanguage) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getTerminologyPreview(subject, resourceId, explanationLanguage);
      setPreview(data);
      if (data.previewProgress.status === 'NOT_STARTED') {
        try {
          const next = await upsertPreviewProgress(
            subject,
            resourceId,
            'IN_PROGRESS',
            data.packageRevisionId,
          );
          setPreview({ ...data, previewProgress: next });
        } catch (err) {
          if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
            setError(t('terminology.formalDisabled'));
          } else {
            setError(t('terminology.saveFailed'));
          }
        }
      } else if (
        data.previewProgress.status === 'PREVIEW_COMPLETE' &&
        data.previewProgress.requiredSetUpdatedSinceCompleted
      ) {
        try {
          const next = await upsertPreviewProgress(
            subject,
            resourceId,
            'PREVIEW_COMPLETE',
            data.packageRevisionId,
          );
          setPreview({ ...data, previewProgress: next });
        } catch {
          /* Keep the notice visible if acknowledgement fails. */
        }
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

  const matchTiles = useMemo(
    () =>
      (preview?.matchTargets ?? []).map((target) => ({
        ...target,
        pinyin:
          preview?.terms.find((card) => card.termId === target.termId)?.primarySurface.pinyin ??
          null,
      })),
    [preview],
  );

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
        setToast({ message: t('terminology.previewSaved'), tone: 'success' });
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

  function markBookmarked(termIds: readonly string[], value: boolean): void {
    setPreview((current) =>
      current
        ? {
            ...current,
            terms: current.terms.map((card) =>
              termIds.includes(card.termId) ? { ...card, alreadyInNotebook: value } : card,
            ),
          }
        : current,
    );
  }

  async function handleToggleBookmark(termId: string, bookmarked: boolean): Promise<void> {
    if (!subject || !resourceId || bookmarkBusy) return;
    setBookmarkBusy(true);
    setError(null);
    try {
      if (bookmarked) {
        await unbookmarkTerm(termId);
        markBookmarked([termId], false);
        setToast({ message: t('terminology.unbookmarkedToast'), tone: 'info' });
      } else {
        await bookmarkTerm(termId, {
          subject,
          explanationLanguage: explanationLanguage ?? 'id',
          source: 'PREVIEW',
          resourceId,
        });
        markBookmarked([termId], true);
        setToast({ message: t('terminology.bookmarkedToast'), tone: 'success' });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.saveFailed'));
      }
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function handleBookmarkAll(): Promise<void> {
    if (!subject || !resourceId || !preview || bookmarkBusy) return;
    setBookmarkBusy(true);
    setError(null);
    try {
      const result = await bookmarkLessonTerms(subject, resourceId, explanationLanguage ?? 'id');
      markBookmarked(result.termIds, true);
      if (result.termIds.length > 0) {
        setToast({ message: t('terminology.bookmarkedToast'), tone: 'success' });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.saveFailed'));
      }
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function handleCheck(pairs: { termId: string; selectedMatchKey: string }[]): Promise<void> {
    if (!subject || !resourceId || !preview || busy) return;
    if (pairs.some((pair) => !pair.selectedMatchKey)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitPreviewCheck(subject, resourceId, pairs);
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
    <div
      className={
        pairsOpen
          ? 'page-content learn-page terminology-preview-page is-matching'
          : 'page-content learn-page terminology-preview-page'
      }
    >
      <AskHost
        context={{ contextType: 'LESSON', contextId: resourceId }}
        hostTitle={title}
        enabled={!pairsOpen}
      >
        {toast ? (
          <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
        ) : null}

        {pairsOpen ? null : (
          <header className="learn-reader-chrome">
            <div className="learn-reader-chrome-row">
              <Link to={`/app/learn/${subject}`} className="learn-back-link">
                <ArrowLeft size={18} aria-hidden="true" />
                {t('learn.backToBrowse')}
              </Link>
              <Link
                to="/app/learn/terms"
                state={notebookStateFrom(`${location.pathname}${location.search}`)}
                className="learn-back-link"
              >
                <NotebookText size={18} aria-hidden="true" />
                {t('learn.openNotebook')}
              </Link>
            </div>
            <h1>{title}</h1>
          </header>
        )}

        {preview.previewProgress.requiredSetUpdatedSinceCompleted && !pairsOpen ? (
          <p className="learn-update-notice" role="status">
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

        {pairsOpen && preview.matchingPairsAvailable ? (
          <TermMatchBoard
            targets={matchTiles}
            busy={busy}
            onSubmit={(pairs) => void handleCheck(pairs)}
            onContinue={() => void handleContinue()}
            onPlayPrompt={(termId, surface) => {
              void audio.play(termId, surface);
            }}
            onEnd={() => {
              setPairsOpen(false);
            }}
          />
        ) : (
          <>
            {preview.terms.length > 0 ? (
              <div className="term-preview-toolbar">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={bookmarkBusy || preview.terms.every((card) => card.alreadyInNotebook)}
                  onClick={() => void handleBookmarkAll()}
                >
                  {t('terminology.bookmarkAll')}
                </button>
              </div>
            ) : null}
            <ol className="term-preview-list">
              {preview.terms.map((card) => (
                <li key={card.termId}>
                  <TermCardView
                    card={card}
                    bookmarked={card.alreadyInNotebook}
                    bookmarkBusy={bookmarkBusy}
                    onToggleBookmark={() =>
                      void handleToggleBookmark(card.termId, card.alreadyInNotebook)
                    }
                    onPlay={
                      (card.primarySurface.audioAvailable ||
                        card.aliases.some((alias) => alias.audioAvailable)) &&
                      !(audio.playFailed && audio.playingTermId === card.termId)
                        ? (surface) => {
                            void audio.play(card.termId, surface);
                          }
                        : undefined
                    }
                    playingSurface={
                      audio.playingTermId === card.termId ? audio.playingSurface : null
                    }
                    playFailed={audio.playFailed && audio.playingTermId === card.termId}
                  />
                </li>
              ))}
            </ol>
          </>
        )}

        {preview.matchingPairsAvailable && !pairsOpen ? (
          <TermPracticeLaunch
            label={t('terminology.practicePairs')}
            onClick={() => {
              setPairsOpen(true);
            }}
          />
        ) : null}

        {pairsOpen ? null : (
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
        )}
      </AskHost>
    </div>
  );
}

export default TerminologyPreviewPage;
