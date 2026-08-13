import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { getPublishedLesson, upsertContentProgress } from './api/learnApi';
import { ContentBlockView } from './components/ContentBlockView';
import { ContentProgressFrom } from './components/ContentProgressChip';
import { LanguageToggle } from './components/LanguageToggle';
import { resolveLocalizedTextForExplanation } from './localizedText';
import {
  clampResumeBlockIndex,
  createResumeProgressCoalescer,
  isUpdatedSinceCompleted,
  type ResumeProgressCoalescer,
} from './progressHelpers';
import {
  isAcademicSubject,
  isExplanationLanguage,
  type ContentProgress,
  type ExplanationLanguage,
  type PublishedLessonDetail,
} from './types';
import { getMistake } from '@/features/assessment/api/assessmentApi';
import { CheckpointCta } from '@/features/assessment/components/CheckpointCta';
import './learn.css';

export function LessonReaderPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const [searchParams] = useSearchParams();
  const linkedMistakeId = searchParams.get('mistakeId');
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;

  const refreshLinkedMistake = useCallback(async () => {
    if (!linkedMistakeId) return;
    await getMistake(linkedMistakeId).catch(() => undefined);
  }, [linkedMistakeId]);

  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [profileLanguageReady, setProfileLanguageReady] = useState(false);
  const [lesson, setLesson] = useState<PublishedLessonDetail | null>(null);
  const [progress, setProgress] = useState<ContentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [resumeHighlightIndex, setResumeHighlightIndex] = useState<number | null>(null);
  const [contentVisible, setContentVisible] = useState(false);

  const resumeAppliedRef = useRef(false);
  const progressSeededRef = useRef(false);
  /** When true, next lesson body load must not jump scroll to the resume block (language switch). */
  const skipResumeScrollRef = useRef(false);
  /** Preserve viewport while explanation language reloads. */
  const preservedScrollYRef = useRef<number | null>(null);
  const activeLessonKeyRef = useRef<string | null>(null);
  const lastSavedIndexRef = useRef<number | null>(null);
  const resumeCoalescerRef = useRef<ResumeProgressCoalescer | null>(null);
  const blockElsRef = useRef<Map<number, HTMLElement>>(new Map());

  const dismissToast = useCallback(() => setToast(null), []);
  const contentComplete = progress?.status === 'CONTENT_COMPLETE';
  const needsReview = isUpdatedSinceCompleted(progress);
  const lessonKey = subject && resourceId ? `${subject}:${resourceId}` : null;

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

  const hasLessonBodyRef = useRef(false);

  const loadLesson = useCallback(async () => {
    if (!subject || !resourceId || !explanationLanguage) return;
    // Soft reload keeps chrome + body mounted during language switches (avoids height collapse jumps).
    const softReload = skipResumeScrollRef.current && hasLessonBodyRef.current;
    if (!softReload) {
      setLoading(true);
      setContentVisible(false);
    }
    setError(null);
    setNotFound(false);
    try {
      const data = await getPublishedLesson(subject, resourceId, explanationLanguage);
      setLesson(data);
      hasLessonBodyRef.current = true;
      setProgress(data.contentProgress);
      const clamped =
        data.body.availability === 'AVAILABLE'
          ? clampResumeBlockIndex(data.contentProgress.resumeBlockIndex, data.body.blocks.length)
          : null;
      // On language switch keep the local reading index; only seed from server on first open.
      if (!softReload) {
        lastSavedIndexRef.current = clamped;
        resumeCoalescerRef.current?.setLastSaved(clamped);
      }
      // Prefer available language if profile default is missing for this resource.
      if (
        data.body.availability === 'LANGUAGE_UNAVAILABLE' &&
        data.availableExplanationLanguages.length > 0 &&
        !data.availableExplanationLanguages.includes(explanationLanguage)
      ) {
        // Keep explicit unavailable state — do not auto-switch (no silent fallback).
      }
      requestAnimationFrame(() => {
        setContentVisible(true);
        // Restore scroll after language switch so the page does not jump to the resume block.
        const preservedY = preservedScrollYRef.current;
        if (preservedY != null) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: preservedY, left: 0, behavior: 'auto' });
            preservedScrollYRef.current = null;
          });
        }
      });
    } catch (err) {
      if (!softReload) {
        setLesson(null);
        setProgress(null);
        hasLessonBodyRef.current = false;
      }
      preservedScrollYRef.current = null;
      skipResumeScrollRef.current = false;
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
    if (!profileLanguageReady || !explanationLanguage || !lessonKey) return;

    if (activeLessonKeyRef.current !== lessonKey) {
      // Fresh lesson entry: allow one-time resume scroll and reset progress seed.
      activeLessonKeyRef.current = lessonKey;
      resumeAppliedRef.current = false;
      progressSeededRef.current = false;
      lastSavedIndexRef.current = null;
      skipResumeScrollRef.current = false;
      preservedScrollYRef.current = null;
      hasLessonBodyRef.current = false;
    }
    // Language-only reloads keep skipResumeScrollRef / preservedScrollY set by handleLanguageChange.

    void loadLesson();
  }, [profileLanguageReady, explanationLanguage, lessonKey, loadLesson]);

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
          resumeCoalescerRef.current?.setLastSaved(next.resumeBlockIndex);
          return refreshLinkedMistake();
        })
        .catch(() => {
          // Non-blocking: student can still read; complete may retry.
          progressSeededRef.current = false;
        });
    } else {
      progressSeededRef.current = true;
      void refreshLinkedMistake();
    }
  }, [lesson, subject, resourceId, progress, refreshLinkedMistake]);

  // One-time resume scroll + highlight — only on first open of a lesson, never on language switch.
  useEffect(() => {
    if (!lesson || lesson.body.availability !== 'AVAILABLE' || resumeAppliedRef.current) return;

    if (skipResumeScrollRef.current) {
      resumeAppliedRef.current = true;
      skipResumeScrollRef.current = false;
      setResumeHighlightIndex(null);
      return;
    }

    const blocks = lesson.body.blocks;
    const clamped = clampResumeBlockIndex(progress?.resumeBlockIndex, blocks.length);
    if (clamped == null || clamped <= 0) {
      resumeAppliedRef.current = true;
      return;
    }
    resumeAppliedRef.current = true;
    // Wait a frame so block refs are mounted after language/content paint.
    const frame = window.requestAnimationFrame(() => {
      const el = blockElsRef.current.get(clamped);
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });
      setResumeHighlightIndex(clamped);
      window.setTimeout(() => setResumeHighlightIndex(null), prefersReducedMotion() ? 0 : 1600);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lesson, progress?.resumeBlockIndex]);

  // Coalesce IN_PROGRESS resume PUTs while reading (not when content is complete).
  useEffect(() => {
    if (!lesson || !subject || !resourceId) return;
    if (lesson.body.availability !== 'AVAILABLE') return;
    if (contentComplete) {
      resumeCoalescerRef.current?.dispose();
      resumeCoalescerRef.current = null;
      return;
    }

    const packageRevisionId = lesson.packageRevisionId;
    const coalescer = createResumeProgressCoalescer({
      delayMs: 350,
      initialLastSaved: lastSavedIndexRef.current,
      save: async (resumeBlockIndex) => {
        const next = await upsertContentProgress(subject, resourceId, {
          status: 'IN_PROGRESS',
          resumeBlockIndex,
          expectedPackageRevisionId: packageRevisionId,
        });
        setProgress(next);
        if (next.resumeBlockIndex != null) {
          lastSavedIndexRef.current = next.resumeBlockIndex;
        }
      },
    });
    resumeCoalescerRef.current = coalescer;

    return () => {
      void coalescer.flushNow().finally(() => {
        coalescer.dispose();
        if (resumeCoalescerRef.current === coalescer) {
          resumeCoalescerRef.current = null;
        }
      });
    };
  }, [lesson, subject, resourceId, contentComplete]);

  // Track farthest visible block for resume index (IN_PROGRESS only).
  useEffect(() => {
    if (!lesson || lesson.body.availability !== 'AVAILABLE' || !subject || !resourceId) return;
    if (contentComplete) return;

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
        resumeCoalescerRef.current?.note(maxVisible);
      },
      { root: null, threshold: 0.55 },
    );

    for (const el of blockElsRef.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [lesson, subject, resourceId, contentComplete]);

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
      await refreshLinkedMistake();
      setToast({
        message: needsReview ? t('learn.lesson.reviewedAck') : t('learn.lesson.contentCompleteAck'),
        tone: 'success',
      });
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
    // Keep the student at the same reading position; do not re-run resume jump.
    skipResumeScrollRef.current = true;
    preservedScrollYRef.current = window.scrollY;
    setExplanationLanguage(lang);
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
  const isComplete = progress?.status === 'CONTENT_COMPLETE' && !needsReview;

  return (
    <div className="page-content learn-page lesson-reader-page">
      <header className="learn-reader-chrome">
        <div className="learn-reader-chrome-row">
          <Link to={`/app/learn/${subject}`} className="learn-back-link">
            <ArrowLeft size={18} aria-hidden="true" />
            {t('learn.backToBrowse')}
          </Link>
          {progress ? <ContentProgressFrom progress={progress} /> : null}
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
        {needsReview ? (
          <p className="learn-update-banner" role="status">
            {t('learn.lesson.updatedSinceComplete')}
          </p>
        ) : null}
      </header>

      {loading && !isAvailable && blocks.length === 0 ? (
        <div className="learn-reader-skeleton" aria-busy="true">
          <div className="learn-skeleton learn-skeleton-block" />
          <div className="learn-skeleton learn-skeleton-block" />
        </div>
      ) : null}

      {!isAvailable && !loading ? (
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
          {lesson.availableExplanationLanguages.length === 0 ? (
            <p>{t('learn.lesson.noLanguagesAvailable')}</p>
          ) : null}
        </section>
      ) : null}

      {isAvailable ? (
        <article
          className={`learn-reader-body${contentVisible ? ' is-visible' : ''}${loading ? ' is-reloading' : ''}`}
          aria-label={title || t('learn.lesson.title')}
          aria-busy={loading || undefined}
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

      {isAvailable ? (
        <footer className="learn-reader-actions">
          {isComplete && !needsReview ? (
            <p className="learn-complete-ack" role="status">
              <Check size={18} aria-hidden="true" />
              {t('learn.lesson.contentCompleteAck')}
            </p>
          ) : (
            <button
              type="button"
              className="btn-primary learn-complete-button"
              onClick={() => void handleMarkComplete()}
              disabled={saving || loading}
              aria-busy={saving}
            >
              {saving
                ? t('learn.lesson.savingProgress')
                : needsReview
                  ? t('learn.lesson.markReviewed')
                  : t('learn.lesson.markContentComplete')}
            </button>
          )}
          {/* Keep checkpoint handoff while lesson soft-update is pending review so last result /
              retry / practice stay available with honest lesson-updated copy. */}
          {progress?.status === 'CONTENT_COMPLETE' && subject && resourceId ? (
            <CheckpointCta
              subject={subject}
              resourceId={resourceId}
              enabled
              lessonContentUpdated={needsReview}
            />
          ) : null}
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
