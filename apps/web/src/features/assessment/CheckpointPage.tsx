import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Play } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { getCheckpointForLesson, startAssessmentSession } from './api/assessmentApi';
import { ExamLanguagePicker } from './components/ExamLanguagePicker';
import { resolveLocalizedText } from './localizedText';
import type { CheckpointForLesson, ExamLanguage } from './types';
import { isAcademicSubject, isExamLanguage } from './types';
import './assessment.css';

export function CheckpointPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;

  const [checkpoint, setCheckpoint] = useState<CheckpointForLesson | null>(null);
  const [examLanguage, setExamLanguage] = useState<ExamLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!subject || !resourceId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getCheckpointForLesson(subject, resourceId);
      setCheckpoint(data);
      if (data.editions.length === 1 && isExamLanguage(data.editions[0]?.examLanguage)) {
        setExamLanguage(data.editions[0].examLanguage);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t('assessment.errors.forbidden'));
      } else {
        setError(t('assessment.errors.loadCheckpoint'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, resourceId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart(): Promise<void> {
    if (!checkpoint || !subject || !examLanguage || !checkpoint.startable) return;
    const edition = checkpoint.editions.find((e) => e.examLanguage === examLanguage);
    if (!edition) return;
    setStarting(true);
    setError(null);
    try {
      const session = await startAssessmentSession({
        purpose: 'CHECKPOINT',
        subject,
        setId: edition.setId,
        examLanguage,
      });
      void navigate(`/app/practice/sessions/${session.sessionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CHECKPOINT_LOCKED') {
        setError(t('assessment.checkpoint.lock.LESSON_NOT_CONTENT_COMPLETE'));
        void load();
      } else {
        setError(t('assessment.errors.startFailed'));
      }
    } finally {
      setStarting(false);
    }
  }

  if (!subject || !resourceId) {
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{t('assessment.errors.invalidLesson')}</p>
          <Link to="/app/learn" className="btn-secondary">
            {t('assessment.backToLearn')}
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
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content assessment-page">
        <section className="empty-state state-notice state-notice-info" role="status">
          <h1>{t('assessment.checkpoint.notFoundTitle')}</h1>
          <p>{t('assessment.checkpoint.notFoundDescription')}</p>
          <Link to={`/app/learn/${subject}/lessons/${resourceId}`} className="btn-secondary">
            {t('assessment.backToLesson')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !checkpoint) {
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

  if (!checkpoint) {
    return (
      <div className="page-content assessment-page">
        <p>{t('assessment.loading')}</p>
      </div>
    );
  }

  const available = checkpoint.editions.map((e) => e.examLanguage);
  const edition = examLanguage
    ? checkpoint.editions.find((e) => e.examLanguage === examLanguage)
    : null;
  const title = edition
    ? resolveLocalizedText(edition.title, i18n.language)
    : t('assessment.checkpoint.title');

  return (
    <div className="page-content assessment-page checkpoint-page">
      <Link to={`/app/learn/${subject}/lessons/${resourceId}`} className="learn-back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('assessment.backToLesson')}
      </Link>

      <header
        className={`assessment-hero${checkpoint.startable ? ' assessment-hero-mint' : ' assessment-hero-cream'}`}
      >
        <p className="assessment-eyebrow">{t('assessment.checkpoint.eyebrow')}</p>
        <h1>{title}</h1>
        {edition ? (
          <p className="assessment-card-meta">
            {t('assessment.practice.questionCount', { count: edition.questionCount })}
            {edition.estimatedMinutes != null
              ? ` · ${t('assessment.practice.minutes', { minutes: edition.estimatedMinutes })}`
              : ''}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="assessment-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      {!checkpoint.startable ? (
        <section className="assessment-lock-panel" role="status">
          <Lock size={22} aria-hidden="true" />
          <div>
            <h2>{t('assessment.checkpoint.lockedTitle')}</h2>
            <p>
              {checkpoint.lockReason
                ? t(`assessment.checkpoint.lock.${checkpoint.lockReason}`)
                : t('assessment.checkpoint.lockedTitle')}
            </p>
          </div>
        </section>
      ) : (
        <>
          {available.length > 0 ? (
            <ExamLanguagePicker
              value={examLanguage}
              available={available}
              onChange={setExamLanguage}
              disabled={starting}
            />
          ) : null}

          <div className="assessment-result-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={!examLanguage || starting || !edition}
              onClick={() => void handleStart()}
              aria-busy={starting}
            >
              <Play size={18} aria-hidden="true" />
              {starting ? t('assessment.starting') : t('assessment.checkpoint.start')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CheckpointPage;
