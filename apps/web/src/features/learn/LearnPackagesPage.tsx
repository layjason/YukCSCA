import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react';
import { DestPageHero } from '@/shared/components/DestPageHero';
import { personalDestTitle, usePreferredGivenName } from '@/shared/identity/preferredGivenName';
import { ApiError } from '@/shared/api/httpClient';
import { listPublishedPackages } from './api/learnApi';
import { formatLearnDate } from './formatLearnDate';
import type { PublishedPackageSummary } from './types';
import './learn.css';

export function LearnPackagesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const preferredName = usePreferredGivenName();
  const lessonsTitle = personalDestTitle(
    t('learn.titleYours'),
    t('learn.titleNamed', { name: preferredName ?? '' }),
    preferredName,
  );
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
      <div className="page-content learn-page learn-page-fill" aria-busy="true" aria-live="polite">
        <DestPageHero tone="lilac" icon={BookOpen} title={lessonsTitle} />
        <div className="learn-skeleton learn-skeleton-list">
          <span className="loading-indicator" aria-hidden="true" />
          <p>{t('learn.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content learn-page learn-page-fill">
        <DestPageHero tone="lilac" icon={BookOpen} title={lessonsTitle} />
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

  if (!packages || packages.length === 0) {
    return (
      <div className="page-content learn-page learn-page-fill">
        <DestPageHero tone="lilac" icon={BookOpen} title={lessonsTitle} />
        <section className="empty-state state-notice state-notice-info" aria-live="polite">
          <h2>{t('learn.emptyPackagesTitle')}</h2>
          <p>{t('learn.emptyPackagesDescription')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content learn-page learn-page-fill learn-packages-page">
      <DestPageHero tone="lilac" icon={BookOpen} title={lessonsTitle} />
      <p>
        <Link to="/app/learn/terms" className="learn-back-link">
          {t('learn.termsLink')}
        </Link>
      </p>

      <ul className="learn-package-list" role="list">
        {packages.map((pkg, index) => {
          const accent = packageAccentClass(index);
          return (
            <li key={pkg.id}>
              <Link to={`/app/learn/${pkg.subject}`} className={`learn-package-card ${accent}`}>
                <span className="learn-package-card-accent" aria-hidden="true" />
                <div className="learn-package-card-top">
                  <span className="learn-package-card-icon" aria-hidden="true">
                    <BookOpen size={24} strokeWidth={1.75} />
                  </span>
                  <span className="learn-package-card-action">
                    {t('learn.openSubject')}
                    <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>
                <div className="learn-package-card-body">
                  <h2>{t(`learn.subjects.${pkg.subject}`)}</h2>
                  <p className="learn-package-card-meta">
                    <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
                    {t('learn.browse.lastUpdated', {
                      date: formatLearnDate(pkg.activeRevision.publishedAt, i18n.language),
                    })}
                  </p>
                  {pkg.examLanguages.length > 0 ? (
                    <ul
                      className="learn-package-lang-list"
                      aria-label={t('learn.browse.examLanguagesLabel')}
                    >
                      {pkg.examLanguages.map((lang) => (
                        <li key={lang} className="learn-package-lang-chip">
                          {t(`learn.browse.examLanguage.${lang}`)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function packageAccentClass(index: number): string {
  const accents = [
    'learn-package-card-sky',
    'learn-package-card-lime',
    'learn-package-card-lilac',
    'learn-package-card-cream',
  ];
  return accents[index % accents.length] ?? 'learn-package-card-sky';
}

export default LearnPackagesPage;
