import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { ApiError } from '@/shared/api/httpClient';
import { listPublishedPackages } from './api/learnApi';
import type { PublishedPackageSummary } from './types';
import './learn.css';

export function LearnPackagesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PublishedPackageSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPublishedPackages();
      setPackages(data);
    } catch (err) {
      setPackages(null);
      if (err instanceof ApiError && err.status === 403) {
        setError(t('learn.errors.forbidden'));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t('learn.errors.unauthorized'));
      } else {
        setError(t('learn.errors.loadPackages'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="page-content learn-page" aria-busy="true" aria-live="polite">
        <h1>{t('learn.title')}</h1>
        <div className="learn-skeleton learn-skeleton-list">
          <span className="loading-indicator" aria-hidden="true" />
          <p>{t('learn.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.title')}</h1>
        <section className="state-notice state-notice-error" role="alert">
          <h2>{t('learn.errors.title')}</h2>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (packages && packages.length === 1) {
    const sole = packages[0];
    if (sole) {
      return <Navigate to={`/app/learn/${sole.subject}`} replace />;
    }
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="page-content learn-page">
        <h1>{t('learn.title')}</h1>
        <section className="empty-state state-notice state-notice-info" aria-live="polite">
          <h2>{t('learn.emptyPackagesTitle')}</h2>
          <p>{t('learn.emptyPackagesDescription')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content learn-page">
      <h1>{t('learn.title')}</h1>
      <p className="learn-lede">{t('learn.packagesLede')}</p>
      <ul className="learn-package-list" role="list">
        {packages.map((pkg) => (
          <li key={pkg.id} className="learn-package-card">
            <div className="learn-package-card-body">
              <h2>{t(`learn.subjects.${pkg.subject}`)}</h2>
              <p className="task-meta">
                {t('learn.browse.revision', { number: pkg.activeRevision.revisionNumber })}
              </p>
              <p className="task-meta">
                {t('learn.browse.examLanguagesLabel')}:{' '}
                {pkg.examLanguages.map((lang) => t(`learn.browse.examLanguage.${lang}`)).join(', ')}
              </p>
            </div>
            <Link to={`/app/learn/${pkg.subject}`} className="btn-primary">
              {t('learn.openSubject')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LearnPackagesPage;
