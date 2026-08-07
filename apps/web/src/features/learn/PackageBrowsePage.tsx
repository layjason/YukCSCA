import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { getPublishedPackageBrowse } from './api/learnApi';
import { OfficialSourceCard } from './components/OfficialSourceCard';
import { OutlineLessonList } from './components/OutlineLessonList';
import { ContentProgressChip } from './components/ContentProgressChip';
import { resolveLocalizedText } from './localizedText';
import { isAcademicSubject, type PublishedPackageBrowse } from './types';
import './learn.css';

export function PackageBrowsePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { subject: subjectParam } = useParams<{ subject: string }>();
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;

  const [browse, setBrowse] = useState<PublishedPackageBrowse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!subject) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getPublishedPackageBrowse(subject);
      setBrowse(data);
    } catch (err) {
      setBrowse(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t('learn.errors.forbidden'));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t('learn.errors.unauthorized'));
      } else {
        setError(t('learn.errors.loadBrowse'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!subject) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.title')}</h1>
        <section className="state-notice state-notice-error" role="alert">
          <h2>{t('learn.errors.invalidSubjectTitle')}</h2>
          <p>{t('learn.errors.invalidSubjectDescription')}</p>
          <Link to="/app/learn" className="btn-secondary">
            {t('learn.backToLearn')}
          </Link>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content learn-page" aria-busy="true" aria-live="polite">
        <div className="learn-browse-header-skeleton">
          <span className="loading-indicator" aria-hidden="true" />
          <p>{t('learn.loading')}</p>
        </div>
        <div className="learn-skeleton learn-skeleton-browse" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content learn-page">
        <h1>{t(`learn.subjects.${subject}`)}</h1>
        <section className="empty-state state-notice state-notice-info" aria-live="polite">
          <h2>{t('learn.browse.notFoundTitle')}</h2>
          <p>{t('learn.browse.notFoundDescription')}</p>
          <Link to="/app/learn" className="btn-secondary">
            {t('learn.backToLearn')}
          </Link>
        </section>
      </div>
    );
  }

  if (error || !browse) {
    return (
      <div className="page-content learn-page">
        <h1>{t(`learn.subjects.${subject}`)}</h1>
        <section className="state-notice state-notice-error" role="alert">
          <h2>{t('learn.errors.title')}</h2>
          <p>{error ?? t('learn.errors.loadBrowse')}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </section>
      </div>
    );
  }

  const continueTitle = browse.continueLesson
    ? resolveLocalizedText(browse.continueLesson.title, i18n.language)
    : '';

  return (
    <div className="page-content learn-page learn-browse-page">
      <header className="learn-browse-header">
        <Link to="/app/learn" className="learn-back-link">
          <ArrowLeft size={18} aria-hidden="true" />
          {t('learn.backToLearn')}
        </Link>
        <h1>{t(`learn.subjects.${subject}`)}</h1>
        <p className="task-meta">
          {t('learn.browse.revision', {
            number: browse.package.activeRevision.revisionNumber,
          })}
        </p>
      </header>

      {browse.continueLesson ? (
        <section className="learn-continue-card" aria-labelledby="learn-continue-heading">
          <h2 id="learn-continue-heading">{t('learn.continue')}</h2>
          <p className="learn-continue-title">{continueTitle}</p>
          <ContentProgressChip status={browse.continueLesson.contentProgress.status} />
          <Link
            to={`/app/learn/${subject}/lessons/${browse.continueLesson.resourceId}`}
            className="btn-primary learn-continue-action"
          >
            <Play size={18} aria-hidden="true" />
            {t('learn.continue')}
          </Link>
        </section>
      ) : null}

      <OfficialSourceCard panel={browse.officialSource} />
      <OutlineLessonList subject={subject} outline={browse.outline} />

      <p className="learn-content-progress-note">{t('learn.contentProgressNote')}</p>
    </div>
  );
}

export default PackageBrowsePage;
