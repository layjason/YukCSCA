import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Lock, Play } from 'lucide-react';
import { getCheckpointForLesson } from '../api/assessmentApi';
import type { AcademicSubject, CheckpointForLesson } from '../types';
import '../assessment.css';

interface CheckpointCtaProps {
  subject: AcademicSubject;
  resourceId: string;
  /** Only fetch when lesson is content-complete (or always to show honest lock). */
  enabled: boolean;
}

type LoadState =
  { status: 'idle' } | { status: 'ready'; checkpoint: CheckpointForLesson } | { status: 'failed' };

/**
 * Compact Learn handoff after content-complete. Uses chips/state, not long lecture copy.
 * Does not claim mastery.
 */
export function CheckpointCta({
  subject,
  resourceId,
  enabled,
}: CheckpointCtaProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getCheckpointForLesson(subject, resourceId)
      .then((data) => {
        if (active) setState({ status: 'ready', checkpoint: data });
      })
      .catch(() => {
        if (active) setState({ status: 'failed' });
      });
    return () => {
      active = false;
    };
  }, [enabled, subject, resourceId]);

  if (!enabled || state.status === 'idle' || state.status === 'failed') return null;

  const checkpoint = state.checkpoint;

  // Hide entirely when no checkpoint exists at all
  if (!checkpoint.startable && checkpoint.lockReason === 'NO_CHECKPOINT_PUBLISHED') {
    return null;
  }

  const href = `/app/learn/${subject}/lessons/${resourceId}/checkpoint`;

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

  return (
    <div className="assessment-checkpoint-cta">
      <div className="assessment-checkpoint-cta-text">
        <strong>{t('assessment.checkpoint.ctaReadyTitle')}</strong>
        <span>{t('assessment.checkpoint.ctaReadyHint')}</span>
      </div>
      <Link to={href} className="btn-primary">
        <Play size={18} aria-hidden="true" />
        {t('assessment.checkpoint.start')}
      </Link>
    </div>
  );
}
