import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { syllabusTopics } from '@/prototype/student/fixtures';
import { PrototypeStatusBoundary } from '@/prototype/student/components/PrototypeStatusBoundary';

export function ProgressPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = usePrototype();

  const completedTasks = state.todayTasks.filter((task) => task.completed).length;
  const totalTasks = state.todayTasks.length;
  const topicsStudied = [
    ...(state.todayTasks.some((task) => task.id === 'today-1' && task.completed)
      ? ['Factorisation']
      : []),
    ...(state.mockSubmitted ? ['Mock preview'] : []),
  ];
  const mistakesReviewed = state.remediationCompleted.length;
  const feasibility = state.plan?.feasibility ?? 'on-track';
  const hasActivity =
    state.todayTasks.some((task) => task.completed) ||
    state.mistakes.length > 0 ||
    state.mockSubmitted;

  if (!hasActivity && state.onboardingStep === 'complete') {
    return (
      <PrototypeStatusBoundary>
        <div className="page-content">
          <h1>{t('progress.title')}</h1>
          <p className="empty-state">{t('progress.emptyState')}</p>
        </div>
      </PrototypeStatusBoundary>
    );
  }

  return (
    <PrototypeStatusBoundary>
      <div className="page-content">
        <h1>{t('progress.title')}</h1>

        <section className="progress-section" aria-labelledby="weekly-heading">
          <h2 id="weekly-heading">{t('progress.weeklyActivity')}</h2>
          <p>
            {t('progress.tasksCompleted', {
              completed: completedTasks,
              total: totalTasks,
            })}
          </p>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={completedTasks}
            aria-valuemin={0}
            aria-valuemax={totalTasks}
          >
            <div
              className="progress-bar-fill"
              style={{
                width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
              }}
            />
          </div>
        </section>

        <section className="progress-section" aria-labelledby="topics-heading">
          <h2 id="topics-heading">{t('progress.topicsStudied')}</h2>
          <ul role="list" className="topic-tags">
            {topicsStudied.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          {topicsStudied.length === 0 && <p>{t('progress.noTopicsYet')}</p>}
        </section>

        <section className="progress-section" aria-labelledby="syllabus-heading">
          <h2 id="syllabus-heading">{t('progress.syllabusProgress')}</h2>
          <p className="progress-distinction">{t('syllabus.sourceNote')}</p>
          <ul className="topic-list" role="list">
            {syllabusTopics.slice(0, 4).map((topic) => (
              <li key={topic.id} className="topic-item">
                <span className="topic-name">{t(topic.name)}</span>
                <span className="topic-coverage">
                  {t(
                    `syllabus.${topic.coverageStatus === 'covered' ? 'covered' : topic.coverageStatus === 'partially-covered' ? 'partiallyCovered' : topic.coverageStatus === 'planned' ? 'planned' : 'notCovered'}`,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {state.mistakes.length > 0 && (
          <section className="progress-section" aria-labelledby="mistakes-heading">
            <h2 id="mistakes-heading">{t('progress.mistakesReviewed')}</h2>
            <p>
              {t('progress.mistakesCount', {
                completed: mistakesReviewed,
                total: state.mistakes.length,
              })}
            </p>
            <Link to="/app/practice/mistakes" className="btn-secondary">
              {t('nav.mistakes')}
            </Link>
          </section>
        )}

        {state.mockSubmitted && (
          <section className="progress-section" aria-labelledby="mock-heading">
            <h2 id="mock-heading">{t('progress.mockResult')}</h2>
            <p>{t('progress.mockEvidenceCaveat')}</p>
            <p>
              {state.priorityChangeApproved
                ? t('progress.priorityApproved')
                : t('progress.priorityPending')}
            </p>
          </section>
        )}

        <section className="progress-section" aria-labelledby="feasibility-heading">
          <h2 id="feasibility-heading">{t('progress.planFeasibility')}</h2>
          <p className={`feasibility-badge feasibility-${feasibility}`}>
            {t(
              `feasibility.${feasibility === 'on-track' ? 'onTrack' : feasibility === 'at-risk' ? 'atRisk' : 'highRisk'}`,
            )}
          </p>
        </section>

        <section className="progress-section" aria-labelledby="next-heading">
          <h2 id="next-heading">{t('progress.nextFocus')}</h2>
          <p>{t('progress.recoveryNote')}</p>
        </section>
      </div>
    </PrototypeStatusBoundary>
  );
}
