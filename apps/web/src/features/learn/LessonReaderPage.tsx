import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import {
  bookmarkTerm,
  getTerminologyPreview,
  resolveTermLookup,
  unbookmarkTerm,
} from '@/shared/api/terminologyStudentApi';
import { TermGlossBubble } from '@/shared/terminology/TermGlossBubble';
import type { TappableSpan } from '@/shared/terminology/TappableText';
import type { TermCard } from '@/shared/terminology/types';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { getPublishedLesson, upsertContentProgress } from './api/learnApi';
import { ContentBlockView } from './components/ContentBlockView';
import { ContentProgressFrom } from './components/ContentProgressChip';
import { LanguageToggle } from './components/LanguageToggle';
import { LessonTermRail } from './components/LessonTermRail';
import { LessonVideo } from './components/LessonVideo';
import { resolveLocalizedTextForExplanation } from './localizedText';
import { previewHref } from './previewNavigation';
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
  type VideoPlaybackPosition,
} from './types';
import { getMistake } from '@/features/assessment/api/assessmentApi';
import { CheckpointCta } from '@/features/assessment/components/CheckpointCta';
import { AskHost, mathBlocksFrom, useHideTermRail } from '@/features/agent';
import './learn.css';

/** App shell scrolls `.app-content-wrapper`, not `window`. */
function getShellScroller(): HTMLElement | null {
  return document.querySelector('.app-content-wrapper');
}

function readShellScrollTop(): number {
  const scroller = getShellScroller();
  return scroller ? scroller.scrollTop : window.scrollY;
}

function writeShellScrollTop(top: number): void {
  const scroller = getShellScroller();
  if (scroller) {
    scroller.scrollTop = top;
    return;
  }
  window.scrollTo({ top, left: 0, behavior: 'auto' });
}

export function LessonReaderPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const [searchParams] = useSearchParams();
  const linkedMistakeId = searchParams.get('mistakeId');
  const blockParam = searchParams.get('block');
  const blockFromQuery = blockParam != null && /^\d+$/.test(blockParam) ? Number(blockParam) : null;
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;
  const [askOpen, setAskOpen] = useState(false);
  const hideTermRail = useHideTermRail(askOpen);

  const refreshLinkedMistake = useCallback(async () => {
    if (!linkedMistakeId) return;
    await getMistake(linkedMistakeId).catch(() => undefined);
  }, [linkedMistakeId]);

  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [profileLanguageReady, setProfileLanguageReady] = useState(false);
  const [lesson, setLesson] = useState<PublishedLessonDetail | null>(null);
  const [progress, setProgress] = useState<ContentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [resumeHighlightIndex, setResumeHighlightIndex] = useState<number | null>(null);
  const [requiredSetNotice, setRequiredSetNotice] = useState(false);
  const [previewResolved, setPreviewResolved] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [activeGloss, setActiveGloss] = useState<{
    span: TappableSpan;
    target: HTMLElement;
    restoreFocus: boolean;
  } | null>(null);
  const [glossCards, setGlossCards] = useState<Record<string, TermCard>>({});
  const [glossBookmarked, setGlossBookmarked] = useState<Record<string, boolean>>({});
  const [glossBookmarkBusy, setGlossBookmarkBusy] = useState(false);
  const glossHideTimer = useRef<number>(0);

  const resumeAppliedRef = useRef(false);
  const progressSeededRef = useRef(false);
  /** When true, next lesson body load must not jump scroll to the resume block (language switch). */
  const skipResumeScrollRef = useRef(false);
  const preservedScrollTopRef = useRef<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const activeLessonKeyRef = useRef<string | null>(null);
  const lastSavedIndexRef = useRef<number | null>(null);
  const lastVideoPositionRef = useRef<VideoPlaybackPosition | null>(null);
  const videoAssetIdRef = useRef<string | null>(null);
  const resumeCoalescerRef = useRef<ResumeProgressCoalescer | null>(null);
  const blockElsRef = useRef<Map<number, HTMLElement>>(new Map());
  const loadGenerationRef = useRef(0);
  const hasLessonBodyRef = useRef(false);

  const dismissToast = useCallback(() => setToast(null), []);
  const contentComplete = progress?.status === 'CONTENT_COMPLETE';
  const needsReview = isUpdatedSinceCompleted(progress);

  // CR-02: each IN_PROGRESS write replaces the stored video position. Seed once per
  // published asset so later scroll coalescing cannot clobber a just-reported time.
  useEffect(() => {
    const assetId = lesson?.video?.videoAssetId ?? null;
    if (assetId === videoAssetIdRef.current) return;
    videoAssetIdRef.current = assetId;
    if (lesson?.video && progress?.video?.videoAssetId === lesson.video.videoAssetId) {
      lastVideoPositionRef.current = {
        videoAssetId: lesson.video.videoAssetId,
        positionSeconds: progress.video.positionSeconds,
      };
    } else if (lesson?.video) {
      lastVideoPositionRef.current = {
        videoAssetId: lesson.video.videoAssetId,
        positionSeconds: 0,
      };
    } else {
      lastVideoPositionRef.current = null;
    }
  }, [lesson, progress?.video]);
  const lessonKey = subject && resourceId ? `${subject}:${resourceId}` : null;

  function cancelGlossHide(): void {
    window.clearTimeout(glossHideTimer.current);
  }

  function scheduleGlossHide(): void {
    cancelGlossHide();
    glossHideTimer.current = window.setTimeout(() => setActiveGloss(null), 220);
  }

  useEffect(() => () => window.clearTimeout(glossHideTimer.current), []);

  useEffect(() => {
    if (!activeGloss) return;
    const target = activeGloss.target;
    function onDoc(event: PointerEvent): void {
      const node = event.target as Node | null;
      if (!node) return;
      if (target.contains(node)) return;
      const glossEl = document.querySelector('.term-gloss');
      if (glossEl?.contains(node)) return;
      setActiveGloss(null);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [activeGloss]);

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
    const requestId = ++loadGenerationRef.current;
    // Same-lesson reloads (language switch) keep the body and Checkpoint mounted.
    const softReload = hasLessonBodyRef.current;
    if (!softReload) {
      setLoading(true);
    } else {
      setReloading(true);
    }
    setError(null);
    setNotFound(false);
    try {
      const data = await getPublishedLesson(subject, resourceId, explanationLanguage);
      if (requestId !== loadGenerationRef.current) return;
      setLesson(data);
      hasLessonBodyRef.current = true;
      // Progress is lesson-scoped, not language-scoped. Replacing it on a language
      // reload remounts CheckpointCta (idle → null → fade-in).
      if (!softReload) {
        setProgress(data.contentProgress);
      }
      const clamped =
        data.body.availability === 'AVAILABLE'
          ? clampResumeBlockIndex(data.contentProgress.resumeBlockIndex, data.body.blocks.length)
          : null;
      // On language switch keep the local reading index; only seed from server on first open.
      if (!softReload) {
        lastSavedIndexRef.current = clamped;
        resumeCoalescerRef.current?.setLastSaved(clamped);
      }
    } catch (err) {
      if (requestId !== loadGenerationRef.current) return;
      if (!softReload) {
        setLesson(null);
        setProgress(null);
        hasLessonBodyRef.current = false;
        preservedScrollTopRef.current = null;
        if (columnRef.current) columnRef.current.style.minHeight = '';
      }
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
      if (requestId === loadGenerationRef.current) {
        setLoading(false);
        setReloading(false);
      }
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
      preservedScrollTopRef.current = null;
      if (columnRef.current) columnRef.current.style.minHeight = '';
      hasLessonBodyRef.current = false;
      setPreviewResolved(false);
      setReloading(false);
    }
    // Language-only reloads keep skipResumeScrollRef / preservedScrollTopRef set by handleLanguageChange.

    void loadLesson();
  }, [profileLanguageReady, explanationLanguage, lessonKey, loadLesson]);

  useEffect(() => {
    if (reloading) return;
    if (!lesson || !subject || !resourceId || !explanationLanguage) return;
    const previewId = lesson.terminology?.previewResourceId;
    if (!previewId) {
      setRequiredSetNotice(false);
      setPreviewResolved(true);
      return;
    }
    let active = true;
    void getTerminologyPreview(subject, previewId, explanationLanguage)
      .then((preview) => {
        if (!active) return;
        if (
          preview.previewProgress.status === 'NOT_STARTED' ||
          preview.previewProgress.status === 'IN_PROGRESS'
        ) {
          void navigate(previewHref(subject, previewId, resourceId), { replace: true });
          return;
        }
        setRequiredSetNotice(preview.previewProgress.requiredSetUpdatedSinceCompleted);
        setPreviewResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setRequiredSetNotice(false);
        setPreviewResolved(true);
      });
    return () => {
      active = false;
    };
  }, [explanationLanguage, lesson, navigate, reloading, resourceId, subject]);

  const lockColumnHeight = useCallback(() => {
    const column = columnRef.current;
    if (!column) return;
    const locked = Number.parseInt(column.style.minHeight, 10) || 0;
    column.style.minHeight = `${Math.max(locked, column.offsetHeight)}px`;
  }, []);

  // Language reload: keep the column from shrinking (footer stays below the
  // lesson) and restore the shell scroller, not window.
  useLayoutEffect(() => {
    if (!lesson) return;
    lockColumnHeight();
    if (preservedScrollTopRef.current != null) {
      writeShellScrollTop(preservedScrollTopRef.current);
      preservedScrollTopRef.current = null;
    }
  }, [lesson, lockColumnHeight]);

  async function loadGlossCard(termId: string): Promise<TermCard | null> {
    if (!subject || !resourceId || !explanationLanguage) return null;
    setLookupError(null);
    try {
      const result = await resolveTermLookup({
        subject,
        explanationLanguage,
        source: 'LESSON',
        termId,
        resourceId,
      });
      if (result.outcome === 'MATCHED') {
        setGlossCards((curr) => ({ ...curr, [result.card.termId]: result.card }));
        setGlossBookmarked((curr) => ({
          ...curr,
          [result.card.termId]: result.alreadyInNotebook,
        }));
        return result.card;
      }
      setLookupError(t('terminology.notInBank'));
      setActiveGloss(null);
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setLookupError(t('terminology.formalDisabled'));
      } else {
        setLookupError(t('terminology.lookupFailed'));
      }
      return null;
    }
  }

  function handleTermActivate(span: TappableSpan, target: HTMLElement): void {
    cancelGlossHide();
    const fromRail = lesson?.terminology?.rail.find((c) => c.termId === span.termId);
    if (fromRail && glossBookmarked[span.termId] === undefined) {
      setGlossBookmarked((curr) => ({
        ...curr,
        [span.termId]: fromRail.alreadyInNotebook,
      }));
    }
    setActiveGloss({
      span,
      target,
      restoreFocus: target === document.activeElement || target.contains(document.activeElement),
    });
    if (!glossCards[span.termId]) {
      void loadGlossCard(span.termId);
    }
  }

  async function handleToggleGlossBookmark(termId: string): Promise<void> {
    if (!subject || !resourceId || !explanationLanguage || glossBookmarkBusy) return;
    setGlossBookmarkBusy(true);
    setLookupError(null);
    const isSaved = Boolean(glossBookmarked[termId]);
    try {
      if (isSaved) {
        await unbookmarkTerm(termId);
        setGlossBookmarked((curr) => ({ ...curr, [termId]: false }));
        setGlossCards((curr) =>
          curr[termId]
            ? { ...curr, [termId]: { ...curr[termId]!, alreadyInNotebook: false } }
            : curr,
        );
        setToast({ message: t('terminology.unbookmarkedToast'), tone: 'info' });
      } else {
        const result = await bookmarkTerm(termId, {
          subject,
          explanationLanguage,
          source: 'LESSON',
          resourceId,
        });
        setGlossBookmarked((curr) => ({ ...curr, [termId]: true }));
        setGlossCards((curr) => ({ ...curr, [termId]: result.card }));
        setToast({ message: t('terminology.bookmarkedToast'), tone: 'success' });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setLookupError(t('terminology.formalDisabled'));
      } else {
        setLookupError(t('terminology.saveFailed'));
      }
    } finally {
      setGlossBookmarkBusy(false);
    }
  }

  // Seed IN_PROGRESS on first open when not started.
  useEffect(() => {
    if (!previewResolved) return;
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
  }, [lesson, previewResolved, progress, refreshLinkedMistake, resourceId, subject]);

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
    if (blockFromQuery != null) {
      resumeAppliedRef.current = true;
      return;
    }
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
  }, [lesson, progress?.resumeBlockIndex, blockFromQuery]);

  useEffect(() => {
    if (!lesson || lesson.body.availability !== 'AVAILABLE') return;
    if (blockFromQuery == null) return;
    const max = lesson.body.blocks.length;
    if (blockFromQuery < 0 || blockFromQuery >= max) return;
    const frame = window.requestAnimationFrame(() => {
      const el = blockElsRef.current.get(blockFromQuery);
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });
      setResumeHighlightIndex(blockFromQuery);
      window.setTimeout(() => setResumeHighlightIndex(null), prefersReducedMotion() ? 0 : 1600);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lesson, blockFromQuery]);

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
        const video = lastVideoPositionRef.current;
        const next = await upsertContentProgress(subject, resourceId, {
          status: 'IN_PROGRESS',
          resumeBlockIndex,
          ...(video ? { video } : {}),
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

  const handleVideoProgressUpdate = useCallback(
    (positionSeconds: number) => {
      if (!subject || !resourceId || !lesson || !lesson.video || contentComplete) return;
      const clamped = Math.min(positionSeconds, lesson.video.durationSeconds);
      const resume = lastSavedIndexRef.current ?? 0;
      lastVideoPositionRef.current = {
        videoAssetId: lesson.video.videoAssetId,
        positionSeconds: clamped,
      };
      void upsertContentProgress(subject, resourceId, {
        status: 'IN_PROGRESS',
        resumeBlockIndex: resume,
        video: {
          videoAssetId: lesson.video.videoAssetId,
          positionSeconds: clamped,
        },
        expectedPackageRevisionId: lesson.packageRevisionId,
      })
        .then((next) => {
          setProgress(next);
        })
        .catch(() => undefined);
    },
    [subject, resourceId, lesson, contentComplete],
  );

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
      const videoPos =
        progress?.video ??
        (lesson.video ? { videoAssetId: lesson.video.videoAssetId, positionSeconds: 0 } : null);
      const next = await upsertContentProgress(subject, resourceId, {
        status: 'CONTENT_COMPLETE',
        resumeBlockIndex: resume,
        ...(videoPos ? { video: videoPos } : {}),
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
    skipResumeScrollRef.current = true;
    preservedScrollTopRef.current = readShellScrollTop();
    lockColumnHeight();
    setReloading(true);
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

  // Title follows the loaded body language, not the in-flight toggle. Switching
  // the heading before the body arrives reflows the sticky chrome and jumps Checkpoint.
  const displayedExplanationLanguage = isExplanationLanguage(lesson.requestedExplanationLanguage)
    ? lesson.requestedExplanationLanguage
    : explanationLanguage;
  const title = resolveLocalizedTextForExplanation(
    lesson.title,
    displayedExplanationLanguage,
    i18n.language,
  );
  const body = lesson.body;
  const isAvailable = body.availability === 'AVAILABLE';
  const awaitingPreview = Boolean(lesson.terminology?.previewResourceId) && !previewResolved;
  // Keep an already-available body mounted during a language reload even if the
  // preview gate has not resolved yet. Do not read `.blocks` unless AVAILABLE.
  const showBody = isAvailable && (!awaitingPreview || reloading);
  const blocks = isAvailable ? body.blocks : [];
  const isComplete = progress?.status === 'CONTENT_COMPLETE' && !needsReview;
  const showCheckpoint = Boolean(subject && resourceId && progress?.status === 'CONTENT_COMPLETE');
  const showFooter = showBody || showCheckpoint;

  function highlightBlock(index: number): void {
    setResumeHighlightIndex(index);
    window.setTimeout(() => setResumeHighlightIndex(null), prefersReducedMotion() ? 0 : 1600);
  }

  return (
    <div className="page-content learn-page lesson-reader-page">
      <AskHost
        context={{ contextType: 'LESSON', contextId: resourceId }}
        hostTitle={title || t('learn.lesson.title')}
        mathBlocks={mathBlocksFrom(blocks)}
        onHighlightBlock={highlightBlock}
        onOpenChange={setAskOpen}
      >
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
            <p className="learn-update-notice" role="status">
              {t('learn.lesson.updatedSinceComplete')}
            </p>
          ) : null}
          {requiredSetNotice && lesson.terminology?.previewResourceId ? (
            <p className="learn-update-notice" role="status">
              {t('terminology.requiredSetUpdated')}{' '}
              <Link to={previewHref(subject, lesson.terminology.previewResourceId, resourceId)}>
                {t('terminology.openUpdatedPreview')}
              </Link>
            </p>
          ) : null}
        </header>

        {(loading || awaitingPreview) && !showBody && blocks.length === 0 ? (
          <div className="learn-reader-skeleton" aria-busy="true">
            <div className="learn-skeleton learn-skeleton-block" />
            <div className="learn-skeleton learn-skeleton-block" />
          </div>
        ) : null}

        {!isAvailable && !loading && !awaitingPreview ? (
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

        {showBody ? (
          <div
            className={`learn-reader-with-rail${hideTermRail ? ' without-term-rail' : ''}`}
            ref={columnRef}
          >
            <article
              className={`learn-reader-body${reloading ? ' is-reloading' : ''}`}
              aria-label={title || t('learn.lesson.title')}
              aria-busy={loading || reloading || undefined}
            >
              {lesson.video ? (
                <LessonVideo
                  videoRef={lesson.video}
                  explanationLanguage={displayedExplanationLanguage}
                  initialPositionSeconds={
                    progress?.video?.videoAssetId === lesson.video.videoAssetId
                      ? progress?.video?.positionSeconds
                      : null
                  }
                  onProgressUpdate={handleVideoProgressUpdate}
                />
              ) : null}
              {blocks.map((block, index) => (
                <ContentBlockView
                  key={`${lesson.resourceId}-${index}`}
                  block={block}
                  index={index}
                  highlighted={resumeHighlightIndex === index}
                  termSpans={
                    block.kind === 'TEXT'
                      ? (lesson.terminology?.spans ?? [])
                          .filter((span) => span.blockIndex === index)
                          .map((span) => ({
                            termId: span.termId,
                            surfaceForm: span.surfaceForm,
                            startOffset: span.startOffset,
                            endOffset: span.endOffset,
                          }))
                      : undefined
                  }
                  onTermActivate={lesson.terminology ? handleTermActivate : undefined}
                  onTermHoverEnd={lesson.terminology ? scheduleGlossHide : undefined}
                  blockRef={(el) => {
                    if (el) blockElsRef.current.set(index, el);
                    else blockElsRef.current.delete(index);
                  }}
                />
              ))}
            </article>
            {lesson.terminology && !hideTermRail ? (
              <LessonTermRail
                subject={subject}
                resourceId={resourceId}
                explanationLanguage={explanationLanguage}
                rail={lesson.terminology.rail}
              />
            ) : null}
          </div>
        ) : null}
        {lookupError ? <p role="alert">{lookupError}</p> : null}
        {activeGloss && glossCards[activeGloss.span.termId] ? (
          <TermGlossBubble
            card={glossCards[activeGloss.span.termId]!}
            surfaceForm={activeGloss.span.surfaceForm}
            anchor={activeGloss.target}
            bookmarked={Boolean(glossBookmarked[activeGloss.span.termId])}
            bookmarkBusy={glossBookmarkBusy}
            onToggleBookmark={() => void handleToggleGlossBookmark(activeGloss.span.termId)}
            onDismiss={() => setActiveGloss(null)}
            restoreFocus={activeGloss.restoreFocus}
            onHoverStay={cancelGlossHide}
            onHoverLeave={scheduleGlossHide}
          />
        ) : null}

        {showFooter ? (
          <footer className="learn-reader-actions">
            {showBody ? (
              isComplete && !needsReview ? (
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
              )
            ) : null}
            {/* Keep checkpoint handoff while lesson soft-update is pending review so last result /
              retry / practice stay available with honest lesson-updated copy. */}
            {showCheckpoint ? (
              <CheckpointCta
                key={`${subject}:${resourceId}`}
                subject={subject}
                resourceId={resourceId}
                enabled
                lessonContentUpdated={needsReview}
              />
            ) : null}
          </footer>
        ) : null}

        {toast ? (
          <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} />
        ) : null}
      </AskHost>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default LessonReaderPage;
