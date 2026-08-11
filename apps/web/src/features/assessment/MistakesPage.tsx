import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { listMistakes } from './api/assessmentApi';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import type { MistakeSummary } from './types';
import './assessment.css';

export function MistakesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<MistakeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMistakes();
      setItems(data.items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('assessment.errors.forbidden'));
      } else {
        setError(t('assessment.errors.loadMistakes'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-content assessment-page mistakes-page">
      <Link to="/app/practice" className="learn-back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('assessment.backToPractice')}
      </Link>

      <header className="assessment-hero assessment-hero-sky">
        <p className="assessment-eyebrow">{t('assessment.mistakes.eyebrow')}</p>
        <h1>{t('assessment.mistakes.title')}</h1>
      </header>

      {loading ? (
        <div className="assessment-skeleton" aria-busy="true">
          <div className="assessment-skel-block" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      ) : null}

      {error ? (
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('assessment.retry')}
          </button>
        </section>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="empty-state state-notice state-notice-info" role="status">
          <h2>{t('assessment.mistakes.emptyTitle')}</h2>
          <p>{t('assessment.mistakes.emptyDescription')}</p>
          <Link to="/app/practice" className="btn-secondary">
            {t('assessment.practice.start')}
          </Link>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="assessment-card-list">
          {items.map((row) => (
            <li key={row.mistakeId}>
              <Link
                to={`/app/practice/mistakes/${row.mistakeId}`}
                className="assessment-card assessment-card-continue"
              >
                <div className="assessment-card-main">
                  <span className={`assessment-chip status-${row.status.toLowerCase()}`}>
                    {t(`assessment.mistakes.status.${row.status}`)}
                  </span>
                  <div className="assessment-stem-preview">
                    <AssessmentBlocks blocks={row.stemPreview} />
                  </div>
                  <span className="assessment-card-meta">
                    {t('assessment.mistakes.errorCount', { count: row.errorCount })}
                    {row.revalidationEligible
                      ? ` · ${t('assessment.mistakes.readyToRevalidate')}`
                      : ''}
                  </span>
                </div>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default MistakesPage;
