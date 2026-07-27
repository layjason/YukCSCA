import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { sampleWeeklyReports } from '@/prototype/consumer/fixtures';
import { localizeWeeklyReport } from '@/prototype/consumer/localizedFixtures';

export function ParentReportsIndexPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = useConsumer();
  const { linkedStudent, familyLinkStatus } = state;

  if (!linkedStudent || familyLinkStatus !== 'active') {
    return (
      <div className="parent-reports-index">
        <h1>{t('parent.nav.reports')}</h1>
        <p>{t('parent.report.noLinkedStudent')}</p>
        <Link to="/parent/family" className="btn-secondary">
          {t('parent.nav.family')}
        </Link>
      </div>
    );
  }

  return (
    <div className="parent-reports-index">
      <h1>{t('parent.nav.reports')}</h1>
      <p className="parent-reports-student">{linkedStudent.name}</p>

      <ul className="report-list">
        {sampleWeeklyReports.map((fixtureReport) => {
          const report = localizeWeeklyReport(fixtureReport, t);
          return (
            <li key={report.id}>
              <Link to={`/parent/students/${linkedStudent.id}/report`} className="report-list-item">
                <span className="report-list-week">{report.weekLabel}</span>
                <span className={`report-list-status report-status-${report.status}`}>
                  {report.status === 'available'
                    ? t('parent.report.statusAvailable')
                    : report.status === 'insufficientEvidence'
                      ? t('parent.report.statusInsufficient')
                      : t('parent.report.statusDeliveryFailed')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
