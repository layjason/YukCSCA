import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { syllabusTopics } from '@/prototype/student/fixtures';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { PrototypeStatusBoundary } from '@/prototype/student/components/PrototypeStatusBoundary';

export function LearnPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = usePrototype();

  const currentLesson = {
    id: 'lesson-factorisation-1',
    title: 'fixture.lesson.title',
    topic: 'fixture.topics.factorisation',
  };

  return (
    <PrototypeStatusBoundary>
      <div className="page-content">
        <h1>{t('learn.title')}</h1>

        <section className="learn-track" aria-labelledby="track-heading">
          <h2 id="track-heading">{t('learn.trackTitle')}</h2>
          <p>
            <strong>{t('fixture.subjects.mathEnglishName')}</strong> ·{' '}
            {t('learn.examLanguageEnglish')}
          </p>
          <p>{t('learn.trackDescription')}</p>
        </section>

        {state.practiceSessions.length === 0 ? (
          <section className="empty-state state-notice state-notice-info">
            <h2>{t('learn.emptyTitle')}</h2>
            <p>{t('learn.emptyDescription')}</p>
          </section>
        ) : (
          <section className="learn-continue" aria-labelledby="continue-heading">
            <h2 id="continue-heading">{t('learn.continue')}</h2>
            <div className="learn-current-card">
              <h3>{t(currentLesson.title)}</h3>
              <p className="task-meta">{t(currentLesson.topic)}</p>
              <Link to={`/app/learn/${currentLesson.id}`} className="btn-primary">
                {t('learn.continue')}
              </Link>
            </div>
          </section>
        )}

        <section className="course-hierarchy" aria-labelledby="hierarchy-heading">
          <h2 id="hierarchy-heading">{t('learn.hierarchyTitle')}</h2>
          <ol>
            <li>
              <strong>{t('learn.moduleAlgebra')}</strong>
              <span>{t('learn.moduleDescription')}</span>
            </li>
            <li>
              <strong>{t('fixture.topics.factorisation')}</strong>
              <span>{t('learn.prerequisiteValue')}</span>
            </li>
            <li>
              <strong>{t('fixture.lesson.title')}</strong>
              <span>{t('today.estimatedTime', { minutes: 12 })}</span>
            </li>
          </ol>
        </section>

        <section className="learn-topics" aria-labelledby="topics-heading">
          <h2 id="topics-heading">{t('learn.topics')}</h2>
          <ul className="topic-list" role="list">
            {syllabusTopics.map((topic) => (
              <li key={topic.id} className="topic-item">
                <span className="topic-name">{t(topic.name)}</span>
                <span className={`topic-status personal-${topic.personalStatus}`}>
                  {t(
                    `syllabus.${topic.personalStatus === 'not-started' ? 'notStarted' : topic.personalStatus === 'in-progress' ? 'inProgress' : topic.personalStatus === 'review-needed' ? 'reviewNeeded' : topic.personalStatus === 'learned' ? 'learned' : 'mastered'}`,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Link to="/app/learn/syllabus" className="btn-secondary">
          {t('learn.viewSyllabus')}
        </Link>
        <p className="mastery-caveat">{t('learn.masteryCaveat')}</p>
      </div>
    </PrototypeStatusBoundary>
  );
}
