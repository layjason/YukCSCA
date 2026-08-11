import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, CircleAlert } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { getAssessmentSession, submitSession } from './api/assessmentApi';
import { resultCopyKind, resultFromSessionReview, scoreFromItems } from './assessmentPolicy';
import type { SessionResult } from './types';
import './assessment.css';

interface LocationState {
  result?: SessionResult;
}

export function SessionResultPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [result, setResult] = useState<SessionResult | null>(state.result ?? null);
  const [loading, setLoading] = useState(!state.result);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const session = await getAssessmentSession(sessionId);
      if (session.status === 'SUBMITTED') {
        const review = resultFromSessionReview(session);
        setResult({
          sessionId: session.sessionId,
          status: 'SUBMITTED',
          purpose: session.purpose,
          correctCount: review.correctCount,
          total: review.total,
          strongAssistanceUsed: session.assistanceSummary.strongUsed,
          checkpointPassed: review.checkpointPassed,
          mistakeIds: [],
          evidenceWritten: [],
          items: session.items,
          context: session.context,
          submittedAt: session.submittedAt ?? new Date().toISOString(),
        });
        return;
      }
      if (session.status === 'IN_PROGRESS') {
        // Allow recovering a result via submit (idempotent if already scored server-side)
        const submitted = await submitSession(sessionId);
        setResult(submitted);
        return;
      }
      setError(t('assessment.errors.sessionCancelled'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t('assessment.session.notFoundTitle'));
      } else {
        setError(t('assessment.errors.loadResult'));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    if (!state.result) void load();
  }, [state.result, load]);

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
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error ?? t('assessment.errors.loadResult')}</p>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.backToPractice')}
          </Link>
        </section>
      </div>
    );
  }

  const scores = scoreFromItems(result.items);
  const correctCount = result.correctCount ?? scores.correctCount;
  const total = result.total ?? scores.total;
  const kind = resultCopyKind(result.purpose, result.checkpointPassed, correctCount, total);
  const success = kind === 'checkpoint_pass' || kind === 'revalidation_pass';
  const titleKey =
    kind === 'checkpoint_pass'
      ? 'assessment.result.checkpointPass'
      : kind === 'checkpoint_fail'
        ? 'assessment.result.checkpointFail'
        : kind === 'revalidation_pass'
          ? 'assessment.result.revalidationPass'
          : kind === 'revalidation_fail'
            ? 'assessment.result.revalidationFail'
            : 'assessment.result.topicScore';

  return (
    <div className="page-content assessment-page session-result">
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
        {result.strongAssistanceUsed ? (
          <p className="assessment-result-note">{t('assessment.result.strongAssistanceNote')}</p>
        ) : null}
      </section>

      <div className="assessment-result-actions">
        {result.mistakeIds.length > 0 || result.items.some((i) => i.correct === false) ? (
          <Link to="/app/practice/mistakes" className="btn-primary">
            <BookOpen size={18} aria-hidden="true" />
            {t('assessment.result.reviewMistakes')}
          </Link>
        ) : null}
        <Link to="/app/practice" className="btn-secondary">
          {t('assessment.result.morePractice')}
        </Link>
        {result.context.lessonResourceId ? (
          <Link
            to={`/app/learn/${result.context.subject}/lessons/${result.context.lessonResourceId}`}
            className="btn-secondary"
          >
            {t('assessment.result.backToLesson')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default SessionResultPage;
