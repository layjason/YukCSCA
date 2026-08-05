import { useTranslation } from 'react-i18next';
import type { AcademicPackageSummary } from '../types';

interface AcademicPackageListProps {
  packages: AcademicPackageSummary[];
  onCreatePackage: () => void;
  onSelectPackage: (id: string) => void;
  isLoading?: boolean;
}

export function AcademicPackageList({
  packages,
  onCreatePackage,
  onSelectPackage,
  isLoading = false,
}: AcademicPackageListProps): React.JSX.Element {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="admin-loading" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
        <p className="admin-muted">{t('admin.academic.loadingPackages')}</p>
      </div>
    );
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-intro" aria-labelledby="admin-packages-heading">
        <div className="admin-intro-copy">
          <p className="admin-eyebrow">{t('admin.shell.workspace')}</p>
          <h1 id="admin-packages-heading" className="admin-page-title">
            {t('admin.academic.title')}
          </h1>
          <p className="admin-page-subtitle">{t('admin.academic.subtitle')}</p>
        </div>
        <button type="button" className="btn-primary admin-intro-action" onClick={onCreatePackage}>
          {t('admin.academic.createPackage')}
        </button>
      </section>

      {packages.length === 0 ? (
        <div className="content-card admin-empty-card">
          <div className="admin-empty-icon" aria-hidden="true">
            ▤
          </div>
          <h2 className="admin-empty-title">{t('admin.academic.emptyTitle')}</h2>
          <p className="admin-empty-body">{t('admin.academic.emptyBody')}</p>
          <button type="button" className="btn-primary" onClick={onCreatePackage}>
            {t('admin.academic.createPackage')}
          </button>
        </div>
      ) : (
        <section
          className="admin-package-section"
          aria-label={t('admin.academic.packageListLabel')}
        >
          <div className="admin-section-heading">
            <h2 className="admin-section-title-lg">{t('admin.academic.packageListHeading')}</h2>
            <span className="admin-package-count">
              {t('admin.academic.packageCount', { count: packages.length })}
            </span>
          </div>

          <ul className="admin-package-list">
            {packages.map((pkg) => {
              const statusClass =
                pkg.status === 'PUBLISHED'
                  ? 'badge-status-published'
                  : pkg.status === 'ARCHIVED'
                    ? 'badge-status-archived'
                    : 'badge-status-draft';

              return (
                <li key={pkg.id}>
                  <button
                    type="button"
                    className="content-card admin-package-card"
                    onClick={() => onSelectPackage(pkg.id)}
                  >
                    <div className="admin-package-card-body">
                      <div className="admin-package-card-meta">
                        <span className={statusClass}>
                          {pkg.status === 'PUBLISHED'
                            ? t('admin.academic.statusPublished')
                            : pkg.status === 'ARCHIVED'
                              ? t('admin.academic.statusArchived')
                              : t('admin.academic.statusDraft')}
                        </span>

                        {pkg.hasUnpublishedChanges && (
                          <span className="badge-unpublished-changes">
                            {t('admin.academic.hasUnpublishedChanges')}
                          </span>
                        )}

                        <span className="yukcsca-tag">{t('admin.academic.subjectTag')}</span>
                      </div>

                      <h3 className="admin-package-card-title">
                        {t('admin.academic.packageHeading')}
                      </h3>

                      <p className="admin-package-card-detail">
                        {pkg.activeRevision
                          ? t('admin.academic.activeRevision', {
                              revision: pkg.activeRevision.revisionNumber,
                              date: new Date(pkg.activeRevision.publishedAt).toLocaleDateString(),
                            })
                          : t('admin.academic.noActiveRevision')}
                        {' · '}
                        {t('admin.academic.draftRevision', { revision: pkg.draftRevision })}
                      </p>
                    </div>

                    <span className="admin-package-card-cta" aria-hidden="true">
                      {t('admin.academic.editPackage')}
                      <span className="admin-package-card-arrow">→</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
