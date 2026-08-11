import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  discloseHint,
  getAssessmentSession,
  submitItemAnswer,
  submitSession,
} from './api/assessmentApi';
import {
  applySessionResult,
  canFinishInProgressSession,
  canLockAnswer,
  feedbackVisibleForItem,
  mergeItemIntoSession,
  resumeItemIndex,
  shouldAutoSubmitAfterLastImmediateLock,
} from './assessmentPolicy';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import { FeedbackPanel } from './components/FeedbackPanel';
import { HintPanel } from './components/HintPanel';
import { OptionRadiogroup } from './components/OptionRadiogroup';
import type { AssessmentSession, SessionItemView } from './types';
import './assessment.css';

export function SessionPlayerPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getAssessmentSession(sessionId);
      if (data.status === 'SUBMITTED') {
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
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ITEM_ALREADY_LOCKED') {
        void load();
      } else {
        setError(t('assessment.errors.answerFailed'));
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
        void navigate(`/app/practice/sessions/${session.sessionId}/result`, {
          state: { result: submitted },
        });
      } catch {
        setError(t('assessment.errors.submitFailed'));
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(false);
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
        setError(t('assessment.hints.revalidationBlocked'));
      } else if (err instanceof ApiError && err.code === 'HINT_EXHAUSTED') {
        setError(t('assessment.hints.exhausted'));
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
      setSession(applySessionResult(session, result));
      void navigate(`/app/practice/sessions/${session.sessionId}/result`, {
        state: { result },
      });
    } catch {
      // Keep all-locked / all-answered state; Finish remains available for retry.
      setError(t('assessment.errors.submitFailed'));
    } finally {
      setBusy(false);
    }
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
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('assessment.retry')}
          </button>
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
  const showFeedback = feedbackVisibleForItem(item, session.feedbackMode, session.status);
  const progressPct = Math.round(((itemIndex + 1) / session.items.length) * 100);
  const canFinish = canFinishInProgressSession(session);
  const purposeLabel = t(`assessment.purpose.${session.purpose}`);
  const finishLabel =
    session.feedbackMode === 'IMMEDIATE'
      ? t('assessment.session.finish')
      : t('assessment.session.submitSet');

  return (
    <div className="page-content assessment-page session-player">
      <header className="assessment-player-chrome">
        <div className="assessment-player-top">
          <Link to="/app/practice" className="learn-back-link">
            <ArrowLeft size={18} aria-hidden="true" />
            {t('assessment.backToPractice')}
          </Link>
          <span className="assessment-chip is-soft">{purposeLabel}</span>
        </div>
        <div
          className="assessment-progress-track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={session.items.length}
          aria-valuenow={itemIndex + 1}
          aria-label={t('assessment.session.progressAria', {
            current: itemIndex + 1,
            total: session.items.length,
          })}
        >
          <div className="assessment-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="assessment-progress-label">
          {t('assessment.session.itemOf', { current: itemIndex + 1, total: session.items.length })}
        </p>
      </header>

      {error ? (
        <div className="assessment-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      <article className="assessment-item-card" key={item.itemId}>
        <div className="assessment-stem">
          <AssessmentBlocks blocks={item.stem} />
        </div>

        <OptionRadiogroup
          options={item.options}
          name={`item-${item.itemId}`}
          value={selected}
          onChange={setSelected}
          disabled={locked || busy || session.status !== 'IN_PROGRESS'}
          showCorrectness={showFeedback}
          correctKey={item.feedback?.correctOptionKey ?? null}
          selectedKey={item.selectedOptionKey}
        />

        {session.status === 'IN_PROGRESS' && !locked ? (
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
          />
        ) : null}

        <footer className="assessment-item-actions">
          <button
            type="button"
            className="btn-secondary assessment-nav-btn"
            onClick={() => goToIndex(itemIndex - 1)}
            disabled={itemIndex === 0}
            aria-label={t('assessment.session.previous')}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          {session.status === 'IN_PROGRESS' && !locked ? (
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

          {locked && itemIndex < session.items.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => goToIndex(itemIndex + 1)}>
              {t('assessment.session.next')}
              <ChevronRight size={18} aria-hidden="true" />
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

          <button
            type="button"
            className="btn-secondary assessment-nav-btn"
            onClick={() => goToIndex(itemIndex + 1)}
            disabled={itemIndex >= session.items.length - 1}
            aria-label={t('assessment.session.next')}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </footer>
      </article>
    </div>
  );
}

export default SessionPlayerPage;
