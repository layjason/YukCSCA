import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { listMistakes } from './api/assessmentApi';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import type { MistakeStatus, MistakeSummary } from './types';
import './assessment.css';

const STATUS_FILTERS: Array<MistakeStatus | 'ALL'> = [
  'ALL',
  'AWAITING_REVALIDATION',
  'OPEN',
  'REMEDIATION_IN_PROGRESS',
  'REVALIDATION_PASSED',
];
const PAGE_SIZE = 20;

export function MistakesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<MistakeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MistakeStatus | 'ALL'>('ALL');

  const load = useCallback(
    async (mode: 'replace' | 'append', cursor?: string) => {
      if (mode === 'replace') {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const query = {
        ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
        limit: PAGE_SIZE,
      };
      try {
        const data = await listMistakes({
          ...query,
          ...(cursor ? { cursor } : {}),
        });
        setItems((prev) => (mode === 'replace' ? data.items : [...prev, ...data.items]));
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        const staleCursor =
          mode === 'append' &&
          err instanceof ApiError &&
          err.status === 400 &&
          (err.code === 'ASSESSMENT_VALIDATION_FAILED' ||
            err.violations.some((row) => row.field === 'cursor'));
        if (staleCursor) {
          try {
            const data = await listMistakes(query);
            setItems(data.items);
            setNextCursor(data.nextCursor ?? null);
            return;
          } catch (retryErr) {
            setError(loadErrorMessage(retryErr, t));
            return;
          }
        }
        setError(loadErrorMessage(err, t));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, t],
  );

  useEffect(() => {
    void load('replace');
  }, [load]);

  const readyCount = items.filter((row) => row.revalidationEligible).length;
  const showNotebookEmpty = !loading && !error && items.length === 0 && statusFilter === 'ALL';
  const showFilterEmpty = !loading && !error && items.length === 0 && statusFilter !== 'ALL';

  return (
    <div className="page-content assessment-page mistakes-page">
      <Link to="/app/practice" className="back-btn">
        <span className="back-arrow" aria-hidden="true">
          ←
        </span>
        {t('assessment.backToPractice')}
      </Link>

      <header className="assessment-page-head">
        <p className="assessment-eyebrow">{t('assessment.mistakes.eyebrow')}</p>
        <h1>{t('assessment.mistakes.title')}</h1>
        <p className="assessment-page-lead">
          {readyCount > 0
            ? t('assessment.mistakes.readyCount', { count: readyCount })
            : t('assessment.mistakes.lead')}
        </p>
      </header>

      <div
        className="mistakes-filter"
        role="group"
        aria-label={t('assessment.mistakes.filterLabel')}
      >
        {STATUS_FILTERS.map((status) => {
          const selected = statusFilter === status;
          const label =
            status === 'ALL'
              ? t('assessment.mistakes.filterAll')
              : t(`assessment.mistakes.status.${status}`);
          return (
            <button
              key={status}
              type="button"
              className={`mistakes-filter-btn${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setStatusFilter(status)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load('replace')}>
            {t('assessment.retry')}
          </button>
        </section>
      ) : null}

      {loading ? (
        <div className="assessment-skeleton" aria-busy="true">
          <div className="assessment-skel-block" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      ) : null}

      {showNotebookEmpty ? (
        <div className="empty-state state-notice state-notice-info" role="status">
          <h2>{t('assessment.mistakes.emptyTitle')}</h2>
          <p>{t('assessment.mistakes.emptyDescription')}</p>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.practice.start')}
          </Link>
        </div>
      ) : null}

      {showFilterEmpty ? (
        <div className="empty-state state-notice state-notice-info" role="status">
          <p>{t('assessment.mistakes.filterEmpty')}</p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <ul className="assessment-list mistakes-list">
            {items.map((row) => (
              <li key={row.mistakeId}>
                <Link
                  to={`/app/practice/mistakes/${row.mistakeId}`}
                  className={`mistakes-row${row.revalidationEligible ? ' is-ready-row' : ''} status-${row.status.toLowerCase()}`}
                >
                  <div className="mistakes-row-main">
                    <div className="mistakes-row-meta">
                      <span className={`assessment-status status-${row.status.toLowerCase()}`}>
                        {t(`assessment.mistakes.status.${row.status}`)}
                      </span>
                      <span className="mistakes-row-count">
                        {t('assessment.mistakes.errorCount', { count: row.errorCount })}
                      </span>
                    </div>
                    <div className="mistakes-row-stem">
                      <AssessmentBlocks blocks={row.stemPreview} preview />
                    </div>
                  </div>
                  <span className="assessment-list-chevron" aria-hidden="true">
                    <ChevronRight size={20} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <button
              type="button"
              className="assessment-list-more"
              disabled={loadingMore}
              onClick={() => void load('append', nextCursor)}
              aria-busy={loadingMore}
            >
              {loadingMore
                ? t('assessment.mistakes.loadingMore')
                : t('assessment.mistakes.loadMore')}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function loadErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError && err.status === 403) {
    return t('assessment.errors.forbidden');
  }
  return t('assessment.errors.loadMistakes');
}

export default MistakesPage;
