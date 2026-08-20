import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Play } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { getPublishedPackageBrowse } from './api/learnApi';
import { LearnNotebookEntry } from './components/LearnNotebookEntry';
import { OfficialSourceCard } from './components/OfficialSourceCard';
import { OutlineLessonList } from './components/OutlineLessonList';
import { ContentProgressFrom } from './components/ContentProgressChip';
import { findFirstIncompleteLesson } from './browseHelpers';
import { formatLearnDate } from './formatLearnDate';
import { resolveLocalizedText } from './localizedText';
import { isAcademicSubject, type PublishedPackageBrowse } from './types';
import { lessonEntryHref } from './previewNavigation';
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
      <div className="page-content learn-page learn-page-fill">
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
      <div className="page-content learn-page learn-page-fill" aria-busy="true" aria-live="polite">
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
      <div className="page-content learn-page learn-page-fill">
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
      <div className="page-content learn-page learn-page-fill">
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

  // In-progress → Continue only. Otherwise Start reading → first not-done lesson.
  const continueLesson = browse.continueLesson;
  const startLesson = continueLesson ? null : findFirstIncompleteLesson(browse.outline);
  const continueTitle = continueLesson
    ? resolveLocalizedText(continueLesson.title, i18n.language)
    : '';
  const startTitle = startLesson ? resolveLocalizedText(startLesson.title, i18n.language) : '';
  const updatedLabel = t('learn.browse.lastUpdated', {
    date: formatLearnDate(browse.package.activeRevision.publishedAt, i18n.language),
  });

  return (
    <div className="page-content learn-page learn-page-fill learn-browse-page">
      <header className="learn-browse-hero">
        <div className="learn-reader-chrome-row">
          <Link to="/app/learn" className="learn-back-link">
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            {t('learn.backToLearn')}
          </Link>
          <LearnNotebookEntry compact />
        </div>

        <div className="learn-browse-hero-body">
          <div className="learn-browse-hero-copy">
            <div className="learn-browse-hero-icon" aria-hidden="true">
              <BookOpen size={28} strokeWidth={1.75} />
            </div>
            <div>
              <p className="learn-hub-eyebrow">{t('learn.browse.subjectEyebrow')}</p>
              <div className="learn-browse-title-row">
                <h1>{t(`learn.subjects.${subject}`)}</h1>
              </div>
              <p className="learn-browse-updated">
                <CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />
                {updatedLabel}
              </p>
            </div>
          </div>

          {continueLesson ? (
            <section className="learn-continue-card" aria-labelledby="learn-continue-heading">
              <div className="learn-continue-copy">
                <p className="learn-continue-eyebrow">{t('learn.continue')}</p>
                <h2 id="learn-continue-heading" className="learn-continue-title">
                  {continueTitle}
                </h2>
                <ContentProgressFrom progress={continueLesson.contentProgress} />
              </div>
              <Link
                to={lessonEntryHref(subject, continueLesson)}
                className="btn-primary learn-continue-action"
              >
                <Play size={18} strokeWidth={2} aria-hidden="true" />
                {t('learn.continue')}
              </Link>
            </section>
          ) : startLesson ? (
            <section
              className="learn-continue-card learn-start-card-action"
              aria-labelledby="learn-start-heading"
            >
              <div className="learn-continue-copy">
                <p className="learn-continue-eyebrow">{t('learn.startReadingTitle')}</p>
                <h2 id="learn-start-heading" className="learn-continue-title">
                  {startTitle || t('learn.startReadingDescription')}
                </h2>
                <ContentProgressFrom progress={startLesson.contentProgress} />
              </div>
              <Link
                to={lessonEntryHref(subject, startLesson)}
                className="btn-primary learn-continue-action"
              >
                <Play size={18} strokeWidth={2} aria-hidden="true" />
                {t('learn.startReadingTitle')}
              </Link>
            </section>
          ) : (
            <section className="learn-start-card" aria-labelledby="learn-all-done-heading">
              <div className="learn-start-card-copy">
                <h2 id="learn-all-done-heading">{t('learn.allLessonsDoneTitle')}</h2>
                <p>{t('learn.allLessonsDoneDescription')}</p>
              </div>
            </section>
          )}
        </div>
      </header>

      <div className="learn-browse-layout">
        <div className="learn-browse-main">
          <div className="learn-outline-panel">
            <OutlineLessonList subject={subject} outline={browse.outline} />
          </div>
        </div>

        <aside className="learn-browse-aside">
          <OfficialSourceCard panel={browse.officialSource} />
        </aside>
      </div>
    </div>
  );
}

export default PackageBrowsePage;
