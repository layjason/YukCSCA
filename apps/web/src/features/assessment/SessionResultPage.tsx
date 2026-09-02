import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, CircleAlert, Play, RotateCcw } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  getAssessmentSession,
  listMistakes,
  startAssessmentSession,
  startRevalidation,
} from './api/assessmentApi';
import {
  anyAssistanceUsed,
  itemUsedAssistance,
  resultCopyKind,
  resultFromSessionReview,
  scoreFromItems,
} from './assessmentPolicy';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import { ItemNavigator } from './components/ItemNavigator';
import { OptionRadiogroup } from './components/OptionRadiogroup';
import type { SessionItemView, SessionResult } from './types';
import { AskHost, mathBlocksFrom } from '@/features/agent';
import './assessment.css';

interface LocationState {
  result?: SessionResult;
}

/** Recover mistake ids lost when rebuilding a result from session review alone. */
async function mistakeIdsForSession(sessionId: string): Promise<string[]> {
  try {
    const page = await listMistakes({ limit: 100 });
    return page.items.filter((row) => row.lastSessionId === sessionId).map((row) => row.mistakeId);
  } catch {
    return [];
  }
}

export function SessionResultPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [result, setResult] = useState<SessionResult | null>(state.result ?? null);
  const [loading, setLoading] = useState(!state.result);
  const [error, setError] = useState<string | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [retryBusy, setRetryBusy] = useState(false);
  const [redoBusy, setRedoBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const session = await getAssessmentSession(sessionId);
      if (session.status === 'SUBMITTED') {
        const review = resultFromSessionReview(session);
        const mistakeIds = await mistakeIdsForSession(sessionId);
        setResult({
          sessionId: session.sessionId,
          status: 'SUBMITTED',
          purpose: session.purpose,
          correctCount: review.correctCount,
          total: review.total,
          strongAssistanceUsed: session.assistanceSummary.strongUsed,
          checkpointPassed: review.checkpointPassed,
          mistakeIds,
          evidenceWritten: [],
          items: session.items,
          context: session.context,
          submittedAt: session.submittedAt ?? new Date().toISOString(),
        });
        return;
      }
      if (session.status === 'IN_PROGRESS') {
        // Result is review-only. Never submit as a side effect of opening /result.
        void navigate(`/app/practice/sessions/${sessionId}`, { replace: true });
        return;
      }
      setError(t('assessment.errors.sessionCancelled'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t('assessment.session.notFoundTitle'));
      } else if (
        err instanceof ApiError &&
        (err.status === 409 || err.code === 'SESSION_NOT_RESUMABLE')
      ) {
        setError(t('assessment.errors.sessionCancelled'));
      } else {
        setError(t('assessment.errors.loadResult'));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, t, navigate]);

  useEffect(() => {
    if (!state.result) void load();
  }, [state.result, load]);

  const items = useMemo(() => result?.items ?? [], [result?.items]);
  const firstWrongIndex = useMemo(() => items.findIndex((item) => item.correct === false), [items]);

  useEffect(() => {
    if (firstWrongIndex >= 0) setReviewIndex(firstWrongIndex);
    else setReviewIndex(0);
  }, [firstWrongIndex, result?.sessionId]);

  async function handleRedoRevalidation(): Promise<void> {
    const mistakeId = result?.context.mistakeId ?? result?.mistakeIds[0];
    if (!result || result.purpose !== 'REVALIDATION' || !mistakeId) return;
    setRedoBusy(true);
    setActionError(null);
    try {
      const session = await startRevalidation(mistakeId);
      void navigate(`/app/practice/sessions/${session.sessionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REVALIDATION_NOT_ELIGIBLE') {
        setActionError(t('assessment.mistakes.revalidationIneligible'));
      } else {
        setActionError(t('assessment.errors.revalidationFailed'));
      }
    } finally {
      setRedoBusy(false);
    }
  }

  async function handleRetryCheckpoint(): Promise<void> {
    if (!result || result.purpose !== 'CHECKPOINT' || !result.context.setId) return;
    setRetryBusy(true);
    try {
      const session = await startAssessmentSession({
        purpose: 'CHECKPOINT',
        subject: result.context.subject,
        setId: result.context.setId,
        examLanguage: result.context.examLanguage,
      });
      void navigate(`/app/practice/sessions/${session.sessionId}`);
    } catch {
      setError(t('assessment.errors.startFailed'));
    } finally {
      setRetryBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page-content assessment-page" aria-busy="true">
        <div className="assessment-skeleton">
          <div className="assessment-skel-block" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    const cancelled = error === t('assessment.errors.sessionCancelled');
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error ?? t('assessment.errors.loadResult')}</p>
          {cancelled ? <p>{t('assessment.errors.sessionCancelledHint')}</p> : null}
          <Link to="/app/practice" className={cancelled ? 'btn-primary' : 'btn-secondary'}>
            {t('assessment.backToPractice')}
          </Link>
        </section>
      </div>
    );
  }

  const scores = scoreFromItems(result.items);
  const correctCount = result.correctCount ?? scores.correctCount;
  const total = result.total ?? scores.total;
  const assistanceUsed =
    anyAssistanceUsed(result.context.assistanceSummary, result.strongAssistanceUsed) ||
    result.items.some((item) => itemUsedAssistance(item));
  const kind = resultCopyKind(result.purpose, result.checkpointPassed, correctCount, total, {
    assistanceUsed,
    strongAssistanceUsed: result.strongAssistanceUsed,
  });
  const success = kind === 'checkpoint_pass' || kind === 'revalidation_pass';
  const titleKey =
    kind === 'checkpoint_pass'
      ? 'assessment.result.checkpointPass'
      : kind === 'checkpoint_fail'
        ? 'assessment.result.checkpointFail'
        : kind === 'revalidation_pass'
          ? 'assessment.result.revalidationPass'
          : kind === 'revalidation_assisted'
            ? 'assessment.result.revalidationAssisted'
            : kind === 'revalidation_fail'
              ? 'assessment.result.revalidationFail'
              : 'assessment.result.topicScore';
  const mistakeId = result.context.mistakeId ?? result.mistakeIds[0] ?? null;
  const mistakeDeepLink = mistakeId != null ? `/app/practice/mistakes/${mistakeId}` : null;
  const hasIncorrectItems =
    result.mistakeIds.length > 0 || result.items.some((item) => item.correct === false);
  const showReviewMistakes =
    kind !== 'revalidation_pass' &&
    kind !== 'revalidation_assisted' &&
    (mistakeDeepLink != null || hasIncorrectItems);
  const showRedoRevalidation = kind === 'revalidation_assisted' && mistakeId != null;

  const reviewItem: SessionItemView | null = items[reviewIndex] ?? null;
  const lessonHref =
    result.context.lessonResourceId != null
      ? `/app/learn/${result.context.subject}/lessons/${result.context.lessonResourceId}`
      : null;

  const resultBody = (
    <>
      <Link to="/app/practice" className="learn-back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('assessment.backToPractice')}
      </Link>

      <section
        className={`assessment-result-hero${success ? ' is-success' : ' is-review'}`}
        role="status"
      >
        {success ? (
          <CheckCircle2 size={36} aria-hidden="true" />
        ) : (
          <CircleAlert size={36} aria-hidden="true" />
        )}
        <h1>{t(titleKey)}</h1>
        <p className="assessment-result-score">
          {t('assessment.result.score', { correct: correctCount, total })}
        </p>
        {kind === 'revalidation_assisted' ? (
          <p className="assessment-result-note">{t('assessment.result.assistedNote')}</p>
        ) : result.strongAssistanceUsed ? (
          <p className="assessment-result-note">{t('assessment.result.strongAssistanceNote')}</p>
        ) : null}
        <p className="assessment-result-note">{t('assessment.result.reviewHint')}</p>
      </section>

      {items.length > 0 ? (
        <section className="assessment-result-review" aria-labelledby="result-review-heading">
          <h2 id="result-review-heading" className="assessment-section-title">
            {t('assessment.result.byQuestion')}
          </h2>

          {reviewItem ? (
            <article
              className={`assessment-item-card assessment-result-item${reviewItem.correct === true ? ' is-marked-correct' : ''}${reviewItem.correct === false ? ' is-marked-incorrect' : ''}`}
            >
              <p className="assessment-result-item-status">
                {reviewItem.correct === true && itemUsedAssistance(reviewItem)
                  ? t('assessment.feedback.assistedCorrect')
                  : reviewItem.correct === true
                    ? t('assessment.feedback.correct')
                    : reviewItem.correct === false
                      ? t('assessment.feedback.incorrect')
                      : t('assessment.session.mark.answered')}
              </p>
              <div className="assessment-stem">
                <AssessmentBlocks blocks={reviewItem.stem} />
              </div>
              <OptionRadiogroup
                options={reviewItem.options}
                name={`review-${reviewItem.itemId}`}
                value={reviewItem.selectedOptionKey}
                onChange={() => undefined}
                disabled
                showCorrectness
                correctKey={reviewItem.feedback?.correctOptionKey ?? null}
                selectedKey={reviewItem.selectedOptionKey}
              />
              <ItemNavigator
                items={items}
                currentIndex={reviewIndex}
                onSelect={setReviewIndex}
                showCorrectness
              />
            </article>
          ) : null}
        </section>
      ) : null}

      {actionError ? (
        <div className="assessment-inline-error" role="alert">
          {actionError}
        </div>
      ) : null}

      <div className="assessment-result-actions">
        {showRedoRevalidation ? (
          <button
            type="button"
            className="btn-primary"
            disabled={redoBusy}
            onClick={() => void handleRedoRevalidation()}
            aria-busy={redoBusy}
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.result.redoRevalidation')}
          </button>
        ) : null}

        {showReviewMistakes ? (
          <Link to={mistakeDeepLink ?? '/app/practice/mistakes'} className="btn-primary">
            <BookOpen size={18} aria-hidden="true" />
            {t('assessment.result.reviewMistakes')}
          </Link>
        ) : null}

        {result.purpose === 'CHECKPOINT' && result.context.setId ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={retryBusy}
            onClick={() => void handleRetryCheckpoint()}
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.result.retryCheckpoint')}
          </button>
        ) : null}

        <Link to="/app/practice" className="btn-secondary">
          <Play size={18} aria-hidden="true" />
          {t('assessment.result.morePractice')}
        </Link>

        {lessonHref ? (
          <Link to={lessonHref} className="btn-secondary">
            {t('assessment.result.backToLesson')}
          </Link>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="page-content assessment-page session-result">
      {sessionId && reviewItem ? (
        <AskHost
          key={reviewItem.itemId}
          context={{
            contextType: 'ITEM',
            contextId: reviewItem.itemId,
            sessionId,
            itemId: reviewItem.itemId,
          }}
          hostTitle={t('assessment.result.byQuestion')}
          mathBlocks={mathBlocksFrom(reviewItem.stem)}
        >
          {resultBody}
        </AskHost>
      ) : (
        resultBody
      )}
    </div>
  );
}

export default SessionResultPage;
