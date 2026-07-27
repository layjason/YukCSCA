import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { sampleWeeklyActivityAtRisk } from '@/prototype/consumer/fixtures';

export function StudentOverviewPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { studentId } = useParams<{ studentId: string }>();
  const { state } = useConsumer();
  const { linkedStudent } = state;
  const [actionFeedbackKey, setActionFeedbackKey] = useState<string | null>(null);

  if (!linkedStudent || linkedStudent.id !== studentId) {
    return (
      <div className="student-overview">
        <h1>{t('parent.studentOverview.title')}</h1>
        <p role="alert">{t('parent.studentOverview.notFound')}</p>
        <Link to="/parent/home" className="btn-secondary">
          {t('parent.studentOverview.backHome')}
        </Link>
      </div>
    );
  }

  const activity = sampleWeeklyActivityAtRisk;

  return (
    <div className="student-overview">
      <h1>{t('parent.studentOverview.title')}</h1>
      <p className="student-overview-privacy-note">{t('parent.studentOverview.privacyNote')}</p>

      <section className="student-overview-activity" aria-labelledby="activity-heading">
        <h2 id="activity-heading">{t('parent.studentOverview.weeklySummary')}</h2>
        <dl className="student-overview-stats">
          <dt>{t('parent.studentOverview.tasksLabel')}</dt>
          <dd>
            {activity.tasksCompleted}/{activity.totalTasks}
          </dd>
          <dt>{t('parent.studentOverview.minutesLabel')}</dt>
          <dd>{activity.studyMinutes}</dd>
          <dt>{t('parent.studentOverview.progressLabel')}</dt>
          <dd>{activity.syllabusProgress}%</dd>
        </dl>
      </section>

      <section className="student-overview-feasibility" aria-labelledby="feasibility-heading">
        <h2 id="feasibility-heading">{t('parent.studentOverview.feasibilityLabel')}</h2>
        <p className={`feasibility-badge feasibility-${activity.planFeasibility}`}>
          {t(`feasibility.${activity.planFeasibility}`)}
        </p>
      </section>

      <section className="student-overview-mock" aria-labelledby="mock-heading">
        <h2 id="mock-heading">{t('parent.studentOverview.mockTrend')}</h2>
        <p className="student-overview-evidence-note">
          {t('parent.studentOverview.mockTrendNote')}
        </p>
      </section>

      <section className="student-overview-risk" aria-labelledby="risk-heading">
        <h2 id="risk-heading">{t('parent.studentOverview.riskLabel')}</h2>
        {activity.currentRisk ? (
          <p className="student-overview-risk-alert" role="alert">
            {t('prototypeData.currentRisk')}
          </p>
        ) : (
          <p>{t('parent.studentOverview.noRisk')}</p>
        )}
      </section>

      <section className="student-overview-actions" aria-labelledby="actions-heading">
        <h2 id="actions-heading">{t('parent.studentOverview.actions')}</h2>
        <ul className="student-overview-action-list">
          <li>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActionFeedbackKey('parent.studentOverview.encouragementRecorded')}
            >
              {t('parent.studentOverview.encourage')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActionFeedbackKey('parent.studentOverview.reviewRecorded')}
            >
              {t('parent.studentOverview.suggestReview')}
            </button>
          </li>
          <li>
            <Link to="/parent/purchases" className="btn-secondary">
              {t('parent.studentOverview.browseProduct')}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActionFeedbackKey('parent.studentOverview.dismissed')}
            >
              {t('parent.studentOverview.dismiss')}
            </button>
          </li>
        </ul>
        {actionFeedbackKey && (
          <p className="state-notice state-notice-success" role="status">
            {t(actionFeedbackKey)}
          </p>
        )}
        <p className="student-overview-boundary-note">{t('parent.report.noPlanEdit')}</p>
      </section>

      <Link to={`/parent/students/${linkedStudent.id}/report`} className="btn-secondary">
        {t('parent.studentOverview.viewReports')}
      </Link>
    </div>
  );
}
