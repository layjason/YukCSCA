import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { sampleProducts, sampleWeeklyActivity } from '@/prototype/consumer/fixtures';
import { localizeProduct } from '@/prototype/consumer/localizedFixtures';
import type { EntitlementStatus } from '@/prototype/consumer/models/types';

const ENTITLEMENT_STATUS_KEY: Record<EntitlementStatus, string> = {
  active: 'commerce.entitlements.statusActive',
  expiring: 'commerce.entitlements.statusExpiring',
  expired: 'commerce.entitlements.statusExpired',
  pendingReconciliation: 'commerce.entitlements.statusPending',
};

export function ParentHomePage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = useConsumer();
  const { linkedStudent, familyLinkStatus, entitlements } = state;

  if (!linkedStudent || familyLinkStatus !== 'active') {
    return <NoLinkedStudentState />;
  }

  const activity = sampleWeeklyActivity;

  return (
    <div className="parent-home">
      <h1>{t('parent.home.title')}</h1>

      <section className="parent-home-situation" aria-labelledby="situation-heading">
        <h2 id="situation-heading">{t('parent.home.linked.studentLabel')}</h2>
        <p className="parent-home-student-name">{linkedStudent.name}</p>
      </section>

      <section className="parent-home-activity" aria-labelledby="activity-heading">
        <h2 id="activity-heading">{t('parent.home.linked.weeklyActivity')}</h2>
        <dl className="parent-home-stats">
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

      <section className="parent-home-feasibility" aria-labelledby="feasibility-heading">
        <h2 id="feasibility-heading">{t('parent.home.linked.planFeasibility')}</h2>
        <p className={`parent-home-feasibility-status feasibility-${activity.planFeasibility}`}>
          {t(`parent.home.linked.feasibility${capitalize(activity.planFeasibility)}`)}
        </p>
      </section>

      {activity.currentRisk && (
        <section className="parent-home-risk" aria-labelledby="risk-heading">
          <h2 id="risk-heading">{t('parent.home.linked.currentRisk')}</h2>
          <p className="parent-home-risk-alert" role="alert">
            {activity.currentRisk}
          </p>
        </section>
      )}

      <section className="parent-home-actions" aria-labelledby="actions-heading">
        <h2 id="actions-heading">{t('parent.home.linked.recommendedActions')}</h2>
        <Link to={`/parent/students/${linkedStudent.id}`} className="btn-secondary">
          {t('parent.studentOverview.title')}
        </Link>
        <Link to="/products" className="btn-secondary">
          {t('parent.home.noLinked.browseProducts')}
        </Link>
      </section>

      <section className="parent-home-entitlements" aria-labelledby="entitlements-heading">
        <h2 id="entitlements-heading">{t('parent.home.linked.entitlementSummary')}</h2>
        {entitlements.length > 0 ? (
          <ul className="parent-home-entitlement-list">
            {entitlements.map((ent) => {
              const product = sampleProducts.find(
                (fixtureProduct) => fixtureProduct.id === ent.productId,
              );
              return (
                <li key={ent.id}>
                  {product ? localizeProduct(product, t).name : ent.productName} —{' '}
                  {t(ENTITLEMENT_STATUS_KEY[ent.status])}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>{t('commerce.entitlements.empty')}</p>
        )}
      </section>

      <section className="parent-home-report-link">
        <h2>{t('parent.home.linked.latestReport')}</h2>
        <Link to={`/parent/students/${linkedStudent.id}/report`} className="btn-secondary">
          {t('parent.home.linked.viewReport')}
        </Link>
      </section>
    </div>
  );
}

function NoLinkedStudentState(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="parent-home parent-home-empty">
      <h1>{t('parent.home.noLinked.heading')}</h1>
      <p>{t('parent.home.noLinked.explanation')}</p>

      <div className="parent-home-empty-actions">
        <Link to="/parent/family/create-student" className="btn-primary">
          {t('parent.home.noLinked.createStudent')}
        </Link>
        <Link to="/parent/invitations/inv-fixture-01" className="btn-secondary">
          {t('parent.home.noLinked.acceptInvitation')}
        </Link>
      </div>

      <section className="parent-home-privacy-note" aria-labelledby="privacy-note-heading">
        <h2 id="privacy-note-heading">{t('parent.home.privacyTitle')}</h2>
        <p>{t('parent.home.noLinked.privacyNote')}</p>
      </section>

      <section className="parent-home-browse">
        <Link to="/products" className="btn-secondary">
          {t('parent.home.noLinked.browseProducts')}
        </Link>
      </section>
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
