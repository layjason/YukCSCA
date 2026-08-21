import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, Play, RotateCcw } from 'lucide-react';
import {
  getAssessmentSession,
  getCheckpointForLesson,
  listAssessmentSessions,
} from '../api/assessmentApi';
import type { AcademicSubject, CheckpointForLesson } from '../types';
import '../assessment.css';

interface CheckpointCtaProps {
  subject: AcademicSubject;
  resourceId: string;
  /** Only fetch when lesson is content-complete (or always to show honest lock). */
  enabled: boolean;
  /**
   * When true, the lesson body itself changed since the student last finished it.
   * Independent of checkpoint-question updates.
   */
  lessonContentUpdated?: boolean;
}

type PriorAttempt =
  | { status: 'none' }
  | { status: 'passed'; sessionId: string }
  | { status: 'failed'; sessionId: string }
  | { status: 'unknown'; sessionId: string };

type ReadyState = {
  status: 'ready';
  checkpoint: CheckpointForLesson;
  prior: PriorAttempt;
  inProgressSessionId: string | null;
};

type LoadState = { status: 'idle' } | ReadyState | { status: 'failed' };

/** Last ready strip for a lesson; language reload must not drop to idle/null. */
const readyByLesson = new Map<string, ReadyState>();

function lessonKey(subject: AcademicSubject, resourceId: string): string {
  return `${subject}:${resourceId}`;
}

/**
 * Compact Learn handoff after content-complete. Uses chips/state, not long lecture copy.
 * Does not claim mastery. After a prior attempt, offers retry + practice instead of only Start.
 * When checkpoint material changed since the last attempt, surfaces an honest redo offer.
 */
function CheckpointCtaComponent({
  subject,
  resourceId,
  enabled,
  lessonContentUpdated = false,
}: CheckpointCtaProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const key = lessonKey(subject, resourceId);
  const [state, setState] = useState<LoadState>(() => readyByLesson.get(key) ?? { status: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void (async () => {
      try {
        const [checkpoint, inProgress] = await Promise.all([
          getCheckpointForLesson(subject, resourceId),
          listAssessmentSessions({ status: 'IN_PROGRESS', subject }).catch(
            () => [] as Awaited<ReturnType<typeof listAssessmentSessions>>,
          ),
        ]);
        const inProgressSessionId =
          inProgress.find(
            (row) =>
              row.status === 'IN_PROGRESS' &&
              row.purpose === 'CHECKPOINT' &&
              row.lessonResourceId === resourceId,
          )?.sessionId ?? null;
        let prior: PriorAttempt = { status: 'none' };
        try {
          const submitted = await listAssessmentSessions({
            status: 'SUBMITTED',
            subject,
          });
          const forLesson = submitted.filter(
            (row) => row.purpose === 'CHECKPOINT' && row.lessonResourceId === resourceId,
          );
          const latest = forLesson[0];
          if (latest) {
            try {
              const session = await getAssessmentSession(latest.sessionId);
              const passed = session.context.checkpointPassed === true;
              prior = passed
                ? { status: 'passed', sessionId: latest.sessionId }
                : { status: 'failed', sessionId: latest.sessionId };
            } catch {
              prior = { status: 'unknown', sessionId: latest.sessionId };
            }
          }
        } catch {
          // History is best-effort; still show start CTA.
          prior = { status: 'none' };
        }
        if (active) {
          const ready: ReadyState = {
            status: 'ready',
            checkpoint,
            prior,
            inProgressSessionId,
          };
          readyByLesson.set(key, ready);
          setState(ready);
        }
      } catch {
        // Prefer the last good strip over a blank hole during transient failures.
        if (active && !readyByLesson.has(key)) {
          setState({ status: 'failed' });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, subject, resourceId, key]);

  if (!enabled) return null;

  const view = state.status === 'ready' ? state : (readyByLesson.get(key) ?? null);
  if (!view) return null;

  const checkpoint = view.checkpoint;
  const prior = view.prior;
  const inProgressHref = view.inProgressSessionId
    ? `/app/practice/sessions/${view.inProgressSessionId}`
    : null;

  // Hide entirely when no checkpoint exists at all
  if (!checkpoint.startable && checkpoint.lockReason === 'NO_CHECKPOINT_PUBLISHED') {
    return null;
  }

  const href = `/app/learn/${subject}/lessons/${resourceId}/checkpoint`;
  const resultHref =
    prior.status !== 'none' ? `/app/practice/sessions/${prior.sessionId}/result` : null;
  const checkpointUpdated = checkpoint.checkpointUpdatedSinceLastAttempt === true;

  if (inProgressHref && checkpoint.startable) {
    return (
      <div className="assessment-checkpoint-cta is-continue" role="status">
        <div className="assessment-checkpoint-cta-text">
          <strong>{t('assessment.checkpoint.ctaContinueTitle')}</strong>
          <span>{t('assessment.checkpoint.ctaContinueHint')}</span>
        </div>
        <div className="assessment-checkpoint-cta-actions">
          <Link to={inProgressHref} className="btn-primary">
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.checkpoint.continue')}
          </Link>
          <Link to={href} className="btn-secondary">
            {t('assessment.checkpoint.startNew')}
          </Link>
        </div>
      </div>
    );
  }

  if (!checkpoint.startable) {
    return (
      <div className="assessment-checkpoint-cta is-locked" role="status">
        <div className="assessment-checkpoint-cta-text">
          <strong>{t('assessment.checkpoint.ctaLockedTitle')}</strong>
          <span>
            {checkpoint.lockReason
              ? t(`assessment.checkpoint.lock.${checkpoint.lockReason}`)
              : t('assessment.checkpoint.lockedTitle')}
          </span>
        </div>
        <Lock size={20} aria-hidden="true" />
      </div>
    );
  }

  // Checkpoint questions/sets changed since last attempt — honest redo primary.
  if (checkpointUpdated && prior.status !== 'none') {
    return (
      <div className="assessment-checkpoint-cta is-updated" role="status">
        <div className="assessment-checkpoint-cta-text">
          <strong>
            <span className="assessment-badge is-updated">
              {t('assessment.checkpoint.updatedBadge')}
            </span>{' '}
            {t('assessment.checkpoint.ctaUpdatedTitle')}
          </strong>
          <span>{t('assessment.checkpoint.ctaUpdatedHint')}</span>
          {lessonContentUpdated ? (
            <span className="assessment-checkpoint-cta-note">
              {t('assessment.checkpoint.ctaLessonAlsoUpdated')}
            </span>
          ) : null}
        </div>
        <div className="assessment-checkpoint-cta-actions">
          <Link to={href} className="btn-primary">
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.checkpoint.redoUpdated')}
          </Link>
          {resultHref ? (
            <Link to={resultHref} className="btn-secondary">
              {t('assessment.checkpoint.viewResult')}
            </Link>
          ) : null}
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.checkpoint.morePractice')}
          </Link>
        </div>
      </div>
    );
  }

  if (prior.status === 'passed') {
    return (
      <div className="assessment-checkpoint-cta is-done" role="status">
        <div className="assessment-checkpoint-cta-text">
          <strong>
            <CheckCircle2 size={18} aria-hidden="true" className="assessment-inline-icon" />
            {t('assessment.checkpoint.ctaDoneTitle')}
          </strong>
          <span>
            {lessonContentUpdated
              ? t('assessment.checkpoint.ctaDoneLessonUpdatedHint')
              : t('assessment.checkpoint.ctaDoneHint')}
          </span>
        </div>
        <div className="assessment-checkpoint-cta-actions">
          {resultHref ? (
            <Link to={resultHref} className="btn-secondary">
              {t('assessment.checkpoint.viewResult')}
            </Link>
          ) : null}
          <Link to={href} className="btn-secondary">
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.checkpoint.retry')}
          </Link>
          <Link to="/app/practice" className="btn-primary">
            <Play size={18} aria-hidden="true" />
            {t('assessment.checkpoint.morePractice')}
          </Link>
        </div>
      </div>
    );
  }

  if (prior.status === 'failed' || prior.status === 'unknown') {
    return (
      <div className="assessment-checkpoint-cta is-retry" role="status">
        <div className="assessment-checkpoint-cta-text">
          <strong>{t('assessment.checkpoint.ctaRetryTitle')}</strong>
          <span>
            {lessonContentUpdated
              ? t('assessment.checkpoint.ctaRetryLessonUpdatedHint')
              : t('assessment.checkpoint.ctaRetryHint')}
          </span>
        </div>
        <div className="assessment-checkpoint-cta-actions">
          {resultHref ? (
            <Link to={resultHref} className="btn-secondary">
              {t('assessment.checkpoint.viewResult')}
            </Link>
          ) : null}
          <Link to={href} className="btn-primary">
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.checkpoint.retry')}
          </Link>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.checkpoint.morePractice')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-checkpoint-cta">
      <div className="assessment-checkpoint-cta-text">
        <strong>{t('assessment.checkpoint.ctaReadyTitle')}</strong>
        <span>
          {lessonContentUpdated
            ? t('assessment.checkpoint.ctaReadyLessonUpdatedHint')
            : t('assessment.checkpoint.ctaReadyHint')}
        </span>
      </div>
      <Link to={href} className="btn-primary">
        <Play size={18} aria-hidden="true" />
        {t('assessment.checkpoint.start')}
      </Link>
    </div>
  );
}

export const CheckpointCta = memo(CheckpointCtaComponent);
