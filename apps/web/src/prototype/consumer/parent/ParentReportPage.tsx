import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { sampleWeeklyReports } from '@/prototype/consumer/fixtures';
import type { WeeklyReport } from '@/prototype/consumer/models/types';
import { localizeWeeklyReport } from '@/prototype/consumer/localizedFixtures';

export function ParentReportPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { studentId } = useParams<{ studentId: string }>();
  const { state } = useConsumer();
  const { linkedStudent } = state;
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    sampleWeeklyReports[0]?.id ?? null,
  );

  if (!linkedStudent || linkedStudent.id !== studentId) {
    return (
      <div className="parent-report-page">
        <h1>{t('parent.report.title')}</h1>
        <p role="alert">{t('parent.report.notFound')}</p>
        <Link to="/parent/home" className="btn-secondary">
          {t('parent.report.backHome')}
        </Link>
      </div>
    );
  }

  const selectedReport = sampleWeeklyReports.find((r) => r.id === selectedReportId) ?? null;

  return (
    <div className="parent-report-page">
      <h1>{t('parent.report.title')}</h1>

      <section className="parent-report-list" aria-labelledby="report-list-heading">
        <h2 id="report-list-heading">{t('parent.report.listHeading')}</h2>
        <ul className="report-list">
          {sampleWeeklyReports.map((fixtureReport) => {
            const report = localizeWeeklyReport(fixtureReport, t);
            return (
              <li key={report.id}>
                <button
                  type="button"
                  className={`report-list-item ${report.id === selectedReportId ? 'report-list-item-active' : ''}`}
                  onClick={() => setSelectedReportId(report.id)}
                  aria-pressed={report.id === selectedReportId}
                >
                  <span className="report-list-week">{report.weekLabel}</span>
                  <span className={`report-list-status report-status-${report.status}`}>
                    {getStatusLabel(report.status, t)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selectedReport && <ReportDetail report={selectedReport} />}
    </div>
  );
}

function getStatusLabel(status: WeeklyReport['status'], t: (key: string) => string): string {
  switch (status) {
    case 'available':
      return t('parent.report.statusAvailable');
    case 'insufficientEvidence':
      return t('parent.report.statusInsufficient');
    case 'deliveryFailed':
      return t('parent.report.statusDeliveryFailed');
  }
}

function getRiskLabel(riskLevel: WeeklyReport['riskLevel'], t: (key: string) => string): string {
  switch (riskLevel) {
    case 'none':
      return t('parent.report.riskNone');
    case 'low':
      return t('parent.report.riskLow');
    case 'medium':
      return t('parent.report.riskMedium');
    case 'high':
      return t('parent.report.riskHigh');
  }
}

function ReportDetail({ report }: { report: WeeklyReport }): React.JSX.Element {
  const { t } = useTranslation();
  const localizedReport = localizeWeeklyReport(report, t);

  return (
    <section className="report-detail" aria-labelledby="report-detail-heading">
      <h2 id="report-detail-heading">{localizedReport.weekLabel}</h2>

      <p className={`report-detail-status report-status-${report.status}`}>
        {getStatusLabel(report.status, t)}
      </p>

      {report.status === 'available' && (
        <>
          <p className="report-detail-summary">{localizedReport.summary}</p>

          <dl className="report-detail-stats">
            <dt>
              {t('parent.report.tasksCompleted', {
                completed: report.tasksCompleted,
                total: report.totalTasks,
              })}
            </dt>
            <dd>
              {report.tasksCompleted}/{report.totalTasks}
            </dd>
          </dl>

          {report.topicsProgressed.length > 0 && (
            <div className="report-detail-topics">
              <h3>{t('parent.report.topicsProgressed')}</h3>
              <ul>
                {localizedReport.topicsProgressed.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          )}

          <p className={`report-detail-risk report-risk-${report.riskLevel}`}>
            {t('parent.report.riskLevel')}: {getRiskLabel(report.riskLevel, t)}
          </p>

          {report.recommendedActions.length > 0 && (
            <div className="report-detail-actions">
              <h3>{t('parent.report.recommendedActions')}</h3>
              <ul>
                {localizedReport.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {report.status === 'insufficientEvidence' && (
        <div className="report-detail-insufficient">
          <p>{localizedReport.summary}</p>
          {report.recommendedActions.length > 0 && (
            <ul>
              {localizedReport.recommendedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {report.status === 'deliveryFailed' && (
        <div className="report-detail-delivery-failed">
          <p role="alert">{localizedReport.summary}</p>
          {report.recommendedActions.length > 0 && (
            <ul>
              {localizedReport.recommendedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
