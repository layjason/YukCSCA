import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { getPublishedLesson, upsertContentProgress } from './api/learnApi';
import { ContentBlockView } from './components/ContentBlockView';
import { ContentProgressChip } from './components/ContentProgressChip';
import { LanguageToggle } from './components/LanguageToggle';
import { resolveLocalizedTextForExplanation } from './localizedText';
import { clampResumeBlockIndex } from './progressHelpers';
import {
  isAcademicSubject,
  isExplanationLanguage,
  type ContentProgress,
  type ExplanationLanguage,
  type PublishedLessonDetail,
} from './types';
import './learn.css';

export function LessonReaderPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;

  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [profileLanguageReady, setProfileLanguageReady] = useState(false);
  const [lesson, setLesson] = useState<PublishedLessonDetail | null>(null);
  const [progress, setProgress] = useState<ContentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completeAck, setCompleteAck] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [resumeHighlightIndex, setResumeHighlightIndex] = useState<number | null>(null);
  const [contentVisible, setContentVisible] = useState(false);

  const resumeAppliedRef = useRef(false);
  const progressSeededRef = useRef(false);
  const lastSavedIndexRef = useRef<number | null>(null);
  const blockElsRef = useRef<Map<number, HTMLElement>>(new Map());

  const dismissToast = useCallback(() => setToast(null), []);

  // Load profile default explanation language once (session-only override lives in state).
  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        const lang = isExplanationLanguage(profile.defaultExplanationLanguage)
          ? profile.defaultExplanationLanguage
          : 'id';
        setExplanationLanguage(lang);
      })
      .catch(() => {
        if (active) setExplanationLanguage('id');
      })
      .finally(() => {
        if (active) setProfileLanguageReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadLesson = useCallback(async () => {
    if (!subject || !resourceId || !explanationLanguage) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setContentVisible(false);
    try {
      const data = await getPublishedLesson(subject, resourceId, explanationLanguage);
      setLesson(data);
      setProgress(data.contentProgress);
      // Prefer available language if profile default is missing for this resource.
      if (
        data.body.availability === 'LANGUAGE_UNAVAILABLE' &&
        data.availableExplanationLanguages.length > 0 &&
        !data.availableExplanationLanguages.includes(explanationLanguage)
      ) {
        // Keep explicit unavailable state — do not auto-switch (no silent fallback).
      }
      requestAnimationFrame(() => setContentVisible(true));
    } catch (err) {
      setLesson(null);
      setProgress(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t('learn.errors.forbidden'));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t('learn.errors.unauthorized'));
      } else {
        setError(t('learn.errors.loadLesson'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, resourceId, explanationLanguage, t]);

  useEffect(() => {
    if (!profileLanguageReady || !explanationLanguage) return;
    resumeAppliedRef.current = false;
    progressSeededRef.current = false;
    lastSavedIndexRef.current = null;
    void loadLesson();
  }, [profileLanguageReady, explanationLanguage, loadLesson]);

  // Seed IN_PROGRESS on first open when not started.
  useEffect(() => {
    if (!lesson || !subject || !resourceId || progressSeededRef.current) return;
    if (lesson.body.availability !== 'AVAILABLE') return;
    if (progress?.status === 'NOT_STARTED' || !progress) {
      progressSeededRef.current = true;
      void upsertContentProgress(subject, resourceId, {
        status: 'IN_PROGRESS',
        resumeBlockIndex: 0,
        expectedPackageRevisionId: lesson.packageRevisionId,
      })
        .then((next) => {
          setProgress(next);
          lastSavedIndexRef.current = next.resumeBlockIndex;
        })
        .catch(() => {
          // Non-blocking: student can still read; complete may retry.
          progressSeededRef.current = false;
        });
    } else {
      progressSeededRef.current = true;
    }
  }, [lesson, subject, resourceId, progress]);

  // One-time resume scroll + highlight.
  useEffect(() => {
    if (!lesson || lesson.body.availability !== 'AVAILABLE' || resumeAppliedRef.current) return;
    const blocks = lesson.body.blocks;
    const clamped = clampResumeBlockIndex(progress?.resumeBlockIndex, blocks.length);
    if (clamped == null || clamped <= 0) {
      resumeAppliedRef.current = true;
      return;
    }
    resumeAppliedRef.current = true;
    const el = blockElsRef.current.get(clamped);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      setResumeHighlightIndex(clamped);
      window.setTimeout(() => setResumeHighlightIndex(null), prefersReducedMotion() ? 0 : 1600);
    }
  }, [lesson, progress?.resumeBlockIndex]);

  // Track farthest visible block for resume index (IN_PROGRESS only).
  useEffect(() => {
    if (!lesson || lesson.body.availability !== 'AVAILABLE' || !subject || !resourceId) return;
    if (progress?.status === 'CONTENT_COMPLETE') return;

    const blocks = lesson.body.blocks;
    if (blocks.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxVisible = lastSavedIndexRef.current ?? 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.blockIndex);
          if (Number.isFinite(idx) && idx > maxVisible) maxVisible = idx;
        }
        if (lastSavedIndexRef.current !== null && maxVisible <= (lastSavedIndexRef.current ?? -1)) {
          return;
        }
        if (maxVisible === lastSavedIndexRef.current) return;
        lastSavedIndexRef.current = maxVisible;
        void upsertContentProgress(subject, resourceId, {
          status: 'IN_PROGRESS',
          resumeBlockIndex: maxVisible,
          expectedPackageRevisionId: lesson.packageRevisionId,
        })
          .then((next) => setProgress(next))
          .catch(() => {
            /* keep local max; next intersection may retry */
          });
      },
      { root: null, threshold: 0.55 },
    );

    for (const el of blockElsRef.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [lesson, subject, resourceId, progress?.status]);

  async function handleMarkComplete(): Promise<void> {
    if (!subject || !resourceId || !lesson || saving) return;
    setSaving(true);
    setToast(null);
    try {
      const resume =
        lastSavedIndexRef.current ??
        clampResumeBlockIndex(
          progress?.resumeBlockIndex,
          lesson.body.availability === 'AVAILABLE' ? lesson.body.blocks.length : 0,
        ) ??
        0;
      const next = await upsertContentProgress(subject, resourceId, {
        status: 'CONTENT_COMPLETE',
        resumeBlockIndex: resume,
        expectedPackageRevisionId: lesson.packageRevisionId,
      });
      setProgress(next);
      setCompleteAck(true);
      setToast({ message: t('learn.lesson.contentCompleteAck'), tone: 'success' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setToast({ message: t('learn.errors.progressValidation'), tone: 'error' });
      } else {
        setToast({ message: t('learn.errors.saveProgress'), tone: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLanguageChange(lang: ExplanationLanguage): void {
    if (lang === explanationLanguage) return;
    setExplanationLanguage(lang);
    setCompleteAck(false);
  }

  if (!subject || !resourceId) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.lesson.title')}</h1>
        <section className="state-notice state-notice-error" role="alert">
          <h2>{t('learn.errors.invalidLessonTitle')}</h2>
          <p>{t('learn.errors.invalidLessonDescription')}</p>
          <Link to="/app/learn" className="btn-secondary">
            {t('learn.backToLearn')}
          </Link>
        </section>
      </div>
    );
  }

  if (!profileLanguageReady || (loading && !lesson)) {
    return (
      <div className="page-content learn-page lesson-reader-page" aria-busy="true">
        <div className="learn-reader-skeleton">
          <div className="learn-skeleton learn-skeleton-title" />
          <div className="learn-skeleton learn-skeleton-block" />
          <div className="learn-skeleton learn-skeleton-block" />
          <div className="learn-skeleton learn-skeleton-block short" />
          <p className="sr-only">{t('learn.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.lesson.title')}</h1>
        <section className="empty-state state-notice state-notice-info" role="status">
          <h2>{t('learn.lesson.notFoundTitle')}</h2>
          <p>{t('learn.lesson.notFoundDescription')}</p>
          <Link to={`/app/learn/${subject}`} className="btn-secondary">
            {t('learn.backToBrowse')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !lesson) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.lesson.title')}</h1>
        <section className="state-notice state-notice-error" role="alert">
          <h2>{t('learn.errors.title')}</h2>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void loadLesson()}>
            {t('learn.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (!lesson || !explanationLanguage) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.lesson.title')}</h1>
        <p>{t('learn.loading')}</p>
      </div>
    );
  }

  const title = resolveLocalizedTextForExplanation(
    lesson.title,
    explanationLanguage,
    i18n.language,
  );
  const body = lesson.body;
  const isAvailable = body.availability === 'AVAILABLE';
  const blocks = isAvailable ? body.blocks : [];
  const isComplete = progress?.status === 'CONTENT_COMPLETE';

  return (
    <div className="page-content learn-page lesson-reader-page">
      <header className="learn-reader-chrome">
        <div className="learn-reader-chrome-row">
          <Link to={`/app/learn/${subject}`} className="learn-back-link">
            <ArrowLeft size={18} aria-hidden="true" />
            {t('learn.backToBrowse')}
          </Link>
          {progress ? <ContentProgressChip status={progress.status} /> : null}
        </div>
        <h1 className="learn-reader-title">{title || t('learn.lesson.title')}</h1>
        <LanguageToggle
          value={explanationLanguage}
          available={
            lesson.availableExplanationLanguages.length > 0
              ? lesson.availableExplanationLanguages
              : [explanationLanguage]
          }
          onChange={handleLanguageChange}
          disabled={loading}
        />
        <p className="learn-language-note">{t('learn.lesson.tempLanguageNote')}</p>
        {blocks.length > 0 ? (
          <div
            className="learn-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={blocks.length}
            aria-valuenow={Math.min(
              (lastSavedIndexRef.current ?? progress?.resumeBlockIndex ?? 0) + 1,
              blocks.length,
            )}
            aria-label={t('learn.lesson.progressAria')}
          >
            <div
              className="learn-progress-track-fill"
              style={{
                width: `${Math.round(
                  (((lastSavedIndexRef.current ?? progress?.resumeBlockIndex ?? 0) + 1) /
                    blocks.length) *
                    100,
                )}%`,
              }}
            />
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="learn-reader-skeleton" aria-busy="true">
          <div className="learn-skeleton learn-skeleton-block" />
          <div className="learn-skeleton learn-skeleton-block" />
        </div>
      ) : null}

      {!loading && !isAvailable ? (
        <section
          className="learn-language-unavailable state-notice state-notice-info"
          role="status"
        >
          <h2>{t('learn.lesson.languageUnavailableTitle')}</h2>
          <p>
            {t('learn.lesson.languageUnavailableDescription', {
              language: t(`studentActivation.languages.${body.requestedLanguage}`),
            })}
          </p>
          {lesson.availableExplanationLanguages.length > 0 ? (
            <p>{t('learn.lesson.languageUnavailableHint')}</p>
          ) : (
            <p>{t('learn.lesson.noLanguagesAvailable')}</p>
          )}
        </section>
      ) : null}

      {!loading && isAvailable ? (
        <article
          className={`learn-reader-body${contentVisible ? ' is-visible' : ''}`}
          aria-label={title || t('learn.lesson.title')}
        >
          {blocks.map((block, index) => (
            <ContentBlockView
              key={`${lesson.resourceId}-${explanationLanguage}-${index}`}
              block={block}
              index={index}
              highlighted={resumeHighlightIndex === index}
              blockRef={(el) => {
                if (el) blockElsRef.current.set(index, el);
                else blockElsRef.current.delete(index);
              }}
            />
          ))}
        </article>
      ) : null}

      {!loading && isAvailable ? (
        <footer className="learn-reader-actions">
          {isComplete || completeAck ? (
            <p className="learn-complete-ack" role="status">
              <Check size={18} aria-hidden="true" />
              {t('learn.lesson.contentCompleteAck')}
            </p>
          ) : (
            <button
              type="button"
              className="btn-primary learn-complete-button"
              onClick={() => void handleMarkComplete()}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? t('learn.lesson.savingProgress') : t('learn.lesson.markContentComplete')}
            </button>
          )}
          <p className="learn-content-progress-note">{t('learn.contentProgressNote')}</p>
        </footer>
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} /> : null}
    </div>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default LessonReaderPage;
