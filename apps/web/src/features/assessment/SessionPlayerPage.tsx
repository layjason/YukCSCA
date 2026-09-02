import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, Send } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import {
  discloseHint,
  discloseLanguageHelp,
  getAssessmentSession,
  getMistake,
  submitItemAnswer,
  submitSession,
  updateMistakeAnnotation,
} from './api/assessmentApi';
import {
  applySessionResult,
  canFinishInProgressSession,
  canLockAnswer,
  feedbackVisibleForItem,
  itemUsedAssistance,
  mergeItemIntoSession,
  resumeItemIndex,
  shouldAutoSubmitAfterLastImmediateLock,
} from './assessmentPolicy';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import { FeedbackPanel } from './components/FeedbackPanel';
import { HintPanel } from './components/HintPanel';
import { LanguageHelpAskControl, LanguageHelpPanel } from './components/LanguageHelpPanel';
import { ItemNavigator } from './components/ItemNavigator';
import { OptionRadiogroup } from './components/OptionRadiogroup';
import { AskHost, mathBlocksFrom } from '@/features/agent';
import {
  isExplanationLanguage,
  type AssessmentSession,
  type ExplanationLanguage,
  type LanguageHelpTrigger,
  type SessionItemView,
  type SessionResult,
} from './types';
import './assessment.css';

export function SessionPlayerPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  /** After SET_END submit, stay briefly on player with right/wrong colors before summary. */
  const [postSubmitReview, setPostSubmitReview] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SessionResult | null>(null);
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage>('id');
  const [wordingHardQuestionIds, setWordingHardQuestionIds] = useState<Set<string>>(new Set());
  const [wordingPromptDismissed, setWordingPromptDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getAssessmentSession(sessionId);
      if (data.status === 'SUBMITTED') {
        // Allow deep-link into result; avoid trapping on player unless mid-review.
        void navigate(`/app/practice/sessions/${sessionId}/result`, { replace: true });
        return;
      }
      if (data.status === 'CANCELLED') {
        setError(t('assessment.errors.sessionCancelled'));
        setSession(data);
        return;
      }
      setSession(data);
      const idx = resumeItemIndex(data.items);
      setItemIndex(idx);
      setSelected(data.items[idx]?.selectedOptionKey ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t('assessment.errors.forbidden'));
      } else if (
        err instanceof ApiError &&
        (err.status === 409 || err.code === 'SESSION_NOT_RESUMABLE')
      ) {
        setError(t('assessment.errors.sessionCancelled'));
      } else {
        setError(t('assessment.errors.loadSession'));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate, t]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const item: SessionItemView | null = useMemo(() => {
    if (!session) return null;
    return session.items[itemIndex] ?? null;
  }, [session, itemIndex]);

  useEffect(() => {
    if (item) setSelected(item.selectedOptionKey);
  }, [item?.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToIndex(next: number): void {
    if (!session) return;
    const clamped = Math.max(0, Math.min(next, session.items.length - 1));
    setItemIndex(clamped);
    setSelected(session.items[clamped]?.selectedOptionKey ?? null);
  }

  function showToast(message: string, tone: ToastTone): void {
    setToast({ message, tone });
  }

  async function handleLock(): Promise<void> {
    if (!session || !item || !canLockAnswer(item, selected) || busy) return;
    setBusy(true);
    setError(null);

    let nextSession: AssessmentSession;
    let lockedItem: SessionItemView;
    try {
      const result = await submitItemAnswer(session.sessionId, item.itemId, selected!);
      lockedItem = result.item;
      nextSession = mergeItemIntoSession(session, result.item, result.sessionAssistanceSummary);
      setSession(nextSession);
      setSelected(result.item.selectedOptionKey);
      if (session.feedbackMode === 'SET_END') {
        showToast(t('assessment.session.answerSaved'), 'success');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ITEM_ALREADY_LOCKED') {
        void load();
      } else {
        setError(t('assessment.errors.answerFailed'));
        showToast(t('assessment.errors.answerFailed'), 'error');
      }
      setBusy(false);
      return;
    }

    // Answer lock succeeded. Optional auto-finish is a separate failure domain so the
    // student keeps a Finish control when every item is already locked.
    if (shouldAutoSubmitAfterLastImmediateLock(session, lockedItem)) {
      try {
        const submitted = await submitSession(session.sessionId);
        setSession(applySessionResult(nextSession, submitted));
        await recordWordingHardAfterSubmit(submitted);
        void navigate(`/app/practice/sessions/${session.sessionId}/result`, {
          state: { result: submitted },
        });
      } catch {
        setError(t('assessment.errors.submitFailed'));
        showToast(t('assessment.errors.submitFailed'), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(false);
  }

  async function handleLanguageDisclose(trigger: LanguageHelpTrigger): Promise<void> {
    if (!session || !item || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await discloseLanguageHelp(session.sessionId, item.itemId, trigger);
      setSession(mergeItemIntoSession(session, result.item, result.sessionAssistanceSummary));
      if (trigger === 'WORDING_HARD') {
        setWordingHardQuestionIds((current) => new Set(current).add(item.questionId));
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LANGUAGE_ASSIST_DISABLED') {
        setError(t('assessment.languageHelp.disabled'));
      } else if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('assessment.languageHelp.discloseFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function recordWordingHardAfterSubmit(
    result: SessionResult,
    questionIds: ReadonlySet<string> = wordingHardQuestionIds,
  ): Promise<void> {
    if (questionIds.size === 0 || result.mistakeIds.length === 0) return;
    for (const mistakeId of result.mistakeIds) {
      try {
        const detail = await getMistake(mistakeId);
        if (questionIds.has(detail.questionId)) {
          await updateMistakeAnnotation(mistakeId, {
            errorCause: 'TERMINOLOGY_MISUNDERSTANDING',
          });
        }
      } catch {
        // Annotation is best-effort; the student can still set the cause on the mistake page.
      }
    }
  }

  function markWordingHard(): void {
    if (!item) return;
    const nextIds = new Set(wordingHardQuestionIds).add(item.questionId);
    setWordingHardQuestionIds(nextIds);
    setWordingPromptDismissed((current) => new Set(current).add(item.itemId));
    // SET_END shows this prompt only after submit; disclose is IN_PROGRESS-only.
    if (!item.languageHelp?.disclosed && session?.status === 'IN_PROGRESS') {
      void handleLanguageDisclose('WORDING_HARD');
    }
    if ((postSubmitReview || session?.status === 'SUBMITTED') && submittedResult) {
      void recordWordingHardAfterSubmit(submittedResult, nextIds);
    }
  }

  async function handleDisclose(): Promise<void> {
    if (!session || !item || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await discloseHint(session.sessionId, item.itemId);
      setSession(mergeItemIntoSession(session, result.item, result.sessionAssistanceSummary));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'STRONG_HINT_BLOCKED') {
        // STRONG is hidden on revalidation; treat as no-op messaging.
        setError(null);
      } else if (err instanceof ApiError && err.code === 'HINT_EXHAUSTED') {
        setError(null);
      } else {
        setError(t('assessment.errors.hintFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFinishSession(): Promise<void> {
    if (!session || busy || !canFinishInProgressSession(session)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitSession(session.sessionId);
      const next = applySessionResult(session, result);
      setSession(next);
      setSubmittedResult(result);
      await recordWordingHardAfterSubmit(result);
      // SET_END: show right/wrong on the player first, then student opens summary.
      if (session.feedbackMode === 'SET_END') {
        setPostSubmitReview(true);
        setItemIndex(0);
        showToast(t('assessment.session.setSubmitted'), 'success');
      } else {
        void navigate(`/app/practice/sessions/${session.sessionId}/result`, {
          state: { result },
        });
      }
    } catch {
      setError(t('assessment.errors.submitFailed'));
      showToast(t('assessment.errors.submitFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function goToResult(): void {
    if (!sessionId) return;
    void navigate(`/app/practice/sessions/${sessionId}/result`, {
      state: submittedResult ? { result: submittedResult } : undefined,
    });
  }

  if (!sessionId) {
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{t('assessment.errors.invalidSession')}</p>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.backToPractice')}
          </Link>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content assessment-page" aria-busy="true">
        <div className="assessment-skeleton">
          <div className="assessment-skel-block" />
          <div className="assessment-skel-block" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content assessment-page">
        <section className="empty-state state-notice state-notice-info" role="status">
          <h1>{t('assessment.session.notFoundTitle')}</h1>
          <p>{t('assessment.session.notFoundDescription')}</p>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.backToPractice')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !session) {
    const cancelled = error === t('assessment.errors.sessionCancelled');
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          {cancelled ? <p>{t('assessment.errors.sessionCancelledHint')}</p> : null}
          {cancelled ? (
            <Link to="/app/practice" className="btn-primary">
              {t('assessment.backToPractice')}
            </Link>
          ) : (
            <button type="button" className="btn-primary" onClick={() => void load()}>
              {t('assessment.retry')}
            </button>
          )}
        </section>
      </div>
    );
  }

  if (!session || !item) {
    return (
      <div className="page-content assessment-page">
        <p>{t('assessment.loading')}</p>
      </div>
    );
  }

  const locked = item.status === 'LOCKED';
  const reviewing = postSubmitReview || session.status === 'SUBMITTED';
  const showFeedback = feedbackVisibleForItem(
    item,
    session.feedbackMode,
    reviewing ? 'SUBMITTED' : session.status,
  );
  const showCorrectnessOnNav =
    reviewing ||
    (session.feedbackMode === 'IMMEDIATE' && session.items.some((i) => i.correct != null));
  const canFinish = canFinishInProgressSession(session) && !reviewing;
  const finishLabel =
    session.feedbackMode === 'IMMEDIATE'
      ? t('assessment.session.finish')
      : t('assessment.session.submitSet');

  return (
    <div className="page-content assessment-page session-player">
      <AskHost
        key={item.itemId}
        context={{
          contextType: 'ITEM',
          contextId: item.itemId,
          sessionId: session.sessionId,
          itemId: item.itemId,
        }}
        hostTitle={t('assessment.session.itemOf', {
          current: itemIndex + 1,
          total: session.items.length,
        })}
        mathBlocks={mathBlocksFrom(item.stem)}
        {...(item.status === 'OPEN' && session.status === 'IN_PROGRESS' && !reviewing
          ? {
              openItem: {
                alreadyStrong: item.strongAssistance === true,
                onAsked: () => {
                  void load();
                },
              },
            }
          : {})}
      >
        {toast ? (
          <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
        ) : null}

        <header className="assessment-player-chrome">
          <div className="assessment-player-top">
            <Link to="/app/practice" className="learn-back-link">
              <ArrowLeft size={18} aria-hidden="true" />
              {t('assessment.backToPractice')}
            </Link>
          </div>
          <div className="assessment-progress-row">
            <p className="assessment-progress-label">
              {t('assessment.session.itemOf', {
                current: itemIndex + 1,
                total: session.items.length,
              })}
            </p>
            {item &&
            session.examLanguage === 'zh-CN' &&
            (item.languageHelpAvailable || item.languageHelp) ? (
              !item.languageHelp?.disclosed && session.status === 'IN_PROGRESS' && !reviewing ? (
                <LanguageHelpAskControl
                  busy={busy}
                  onClick={() => void handleLanguageDisclose('STUDENT_REQUEST')}
                />
              ) : item.languageHelp?.disclosed ? (
                <Link
                  to="/app/learn/terms"
                  state={notebookStateFrom(`${location.pathname}${location.search}`)}
                  className="learn-back-link"
                >
                  <BookOpenText size={18} aria-hidden="true" />
                  {t('assessment.languageHelp.openNotebook')}
                </Link>
              ) : null
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="assessment-inline-error" role="alert">
            {error}
          </div>
        ) : null}

        {reviewing ? (
          <div className="assessment-review-banner" role="status">
            <p>{t('assessment.session.reviewBanner')}</p>
            <button type="button" className="btn-primary" onClick={goToResult}>
              {t('assessment.session.viewSummary')}
            </button>
          </div>
        ) : null}

        <article
          className={`assessment-item-card${showFeedback && item.correct === true ? ' is-marked-correct' : ''}${showFeedback && item.correct === false ? ' is-marked-incorrect' : ''}`}
          key={item.itemId}
        >
          <div className="assessment-stem">
            {item.languageHelpAvailable || item.languageHelp ? (
              <LanguageHelpPanel
                item={item}
                subject={session.subject}
                sessionId={session.sessionId}
                explanationLanguage={explanationLanguage}
                lookupSource={
                  wordingHardQuestionIds.has(item.questionId) ? 'LANGUAGE_MISTAKE' : 'ITEM'
                }
                canDisclose={false}
                showAskControl={false}
                busy={busy}
                onDisclose={handleLanguageDisclose}
                renderStem={({ spans, onActivate, onHoverEnd, disabled }) => (
                  <AssessmentBlocks
                    blocks={item.stem}
                    termSpans={spans.length > 0 ? spans : undefined}
                    onTermActivate={spans.length > 0 ? onActivate : undefined}
                    onTermHoverEnd={spans.length > 0 ? onHoverEnd : undefined}
                    termDisabled={disabled}
                  />
                )}
              />
            ) : (
              <AssessmentBlocks blocks={item.stem} />
            )}
          </div>

          <OptionRadiogroup
            options={item.options}
            name={`item-${item.itemId}`}
            value={selected}
            onChange={setSelected}
            disabled={locked || busy || reviewing || session.status !== 'IN_PROGRESS'}
            showCorrectness={showFeedback}
            correctKey={item.feedback?.correctOptionKey ?? null}
            selectedKey={item.selectedOptionKey}
          />

          {session.status === 'IN_PROGRESS' && !locked && !reviewing ? (
            <HintPanel
              item={item}
              purpose={session.purpose}
              busy={busy}
              onDisclose={handleDisclose}
            />
          ) : null}

          {showFeedback && item.feedback ? (
            <FeedbackPanel
              feedback={item.feedback}
              subject={session.subject}
              interfaceLanguage={i18n.language}
              purpose={session.purpose}
              assistanceUsed={itemUsedAssistance(item)}
            />
          ) : null}

          {showFeedback &&
          item.correct === false &&
          item.languageHelpAvailable &&
          !wordingPromptDismissed.has(item.itemId) ? (
            <div
              className="language-help-wording"
              role="group"
              aria-label={t('assessment.languageHelp.wordingHard')}
            >
              <p>{t('assessment.languageHelp.wordingHard')}</p>
              <div className="language-help-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={markWordingHard}
                >
                  {t('assessment.languageHelp.wordingHardYes')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setWordingPromptDismissed((current) => new Set(current).add(item.itemId))
                  }
                >
                  {t('assessment.languageHelp.wordingHardNo')}
                </button>
              </div>
            </div>
          ) : null}

          <footer className="assessment-item-actions">
            {session.status === 'IN_PROGRESS' && !locked && !reviewing ? (
              <button
                type="button"
                className="btn-primary"
                disabled={!canLockAnswer(item, selected) || busy}
                onClick={() => void handleLock()}
                aria-busy={busy}
              >
                {session.feedbackMode === 'IMMEDIATE'
                  ? t('assessment.session.checkAnswer')
                  : t('assessment.session.saveAnswer')}
              </button>
            ) : null}

            {canFinish ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void handleFinishSession()}
                aria-busy={busy}
              >
                <Send size={18} aria-hidden="true" />
                {finishLabel}
              </button>
            ) : null}

            {reviewing ? (
              <button type="button" className="btn-primary" onClick={goToResult}>
                {t('assessment.session.viewSummary')}
              </button>
            ) : null}
          </footer>

          <ItemNavigator
            items={session.items}
            currentIndex={itemIndex}
            onSelect={goToIndex}
            showCorrectness={showCorrectnessOnNav}
          />
        </article>
      </AskHost>
    </div>
  );
}

export default SessionPlayerPage;
