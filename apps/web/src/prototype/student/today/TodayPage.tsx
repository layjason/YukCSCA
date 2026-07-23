import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { PrototypeStatusBoundary } from '@/prototype/student/components/PrototypeStatusBoundary';

export function TodayPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state } = usePrototype();

  const tasks = state.todayTasks;
  const completedCount = tasks.filter((task) => task.completed).length;
  const primaryTask = tasks.find((task) => !task.completed) ?? tasks[0];
  const feasibility = state.plan?.feasibility ?? 'on-track';

  return (
    <PrototypeStatusBoundary>
      <div className="page-content">
        <h1>{t('today.greeting', { name: user?.displayName ?? t('shell.fallbackName') })}</h1>

        <section className="today-focus" aria-labelledby="focus-heading">
          <h2 id="focus-heading">{t('today.focus')}</h2>
          {primaryTask && (
            <div className="today-primary-task">
              <h3>{t(primaryTask.title)}</h3>
              <p className="task-meta">
                {t('today.estimatedTime', { minutes: primaryTask.estimatedMinutes })}
              </p>
              <div className="task-why">
                <strong>{t('today.whyTask')}</strong>
                <p>{t(primaryTask.reason)}</p>
              </div>
              <p className="task-completion">
                <strong>{t('today.completion')}:</strong> {t(primaryTask.completionRule)}
              </p>
              <Link to={primaryTask.route} className="btn-primary">
                {t('today.continueLearning')}
              </Link>
            </div>
          )}
        </section>

        {tasks.length === 0 && (
          <section className="empty-state state-notice state-notice-info">
            <h2>{t('today.emptyTitle')}</h2>
            <p>{t('today.noTasks')}</p>
            <Link to="/app/learn" className="btn-secondary">
              {t('today.browseLearn')}
            </Link>
          </section>
        )}

        <section className="today-status" aria-labelledby="status-heading">
          <h2 id="status-heading">{t('today.planStatus')}</h2>
          <p className={`feasibility-badge feasibility-${feasibility}`}>
            {t(
              `feasibility.${feasibility === 'on-track' ? 'onTrack' : feasibility === 'at-risk' ? 'atRisk' : 'highRisk'}`,
            )}
          </p>
        </section>

        <section className="today-tasks" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">{t('today.dailyGoal')}</h2>
          <p className="task-progress">
            {t('today.tasksCompleted', { completed: completedCount, total: tasks.length })}
          </p>
          <ul className="task-list" role="list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-item ${task.completed ? 'task-done' : ''}`}>
                <Link to={task.route}>
                  <span className="task-item-title">{t(task.title)}</span>
                  <span className="task-meta">
                    {t('today.estimatedTime', { minutes: task.estimatedMinutes })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="today-guidance" aria-labelledby="guided-heading">
          <h2 id="guided-heading">{t('today.guidedTitle')}</h2>
          <p>{t('today.guidedDescription')}</p>
          <p className="preview-contextual">{t('today.guidedBoundary')}</p>
        </section>

        <section className="today-schedule" aria-labelledby="schedule-heading">
          <h2 id="schedule-heading">{t('today.scheduleTitle')}</h2>
          <p>{t('today.scheduleRecovery')}</p>
        </section>
      </div>
    </PrototypeStatusBoundary>
  );
}
