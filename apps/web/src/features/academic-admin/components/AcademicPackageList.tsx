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
      <div className="center-card" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
            {t('admin.academic.title')}
          </h1>
          <p
            style={{
              margin: 'var(--space-xxs) 0 0',
              color: 'var(--color-ink-muted)',
              fontSize: '0.95rem',
            }}
          >
            {t('admin.academic.subtitle')}
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={onCreatePackage}>
          + {t('admin.academic.createPackage')}
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: 'var(--space-xxl)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
            No Academic Packages Created
          </h3>
          <p
            style={{ color: 'var(--color-ink-muted)', margin: 'var(--space-xs) 0 var(--space-lg)' }}
          >
            Initialize the first CSCA 2025 Mathematics preparation package to begin.
          </p>
          <button type="button" className="btn-primary" onClick={onCreatePackage}>
            + {t('admin.academic.createPackage')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {packages.map((pkg) => {
            const statusClass =
              pkg.status === 'PUBLISHED'
                ? 'badge-status-published'
                : pkg.status === 'ARCHIVED'
                  ? 'badge-status-archived'
                  : 'badge-status-draft';

            return (
              <div
                key={pkg.id}
                className="content-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  transition:
                    'transform var(--motion-instant) var(--ease-standard), border-color var(--motion-quick) var(--ease-standard)',
                  cursor: 'pointer',
                }}
                onClick={() => onSelectPackage(pkg.id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <span className={statusClass}>
                      {pkg.status === 'PUBLISHED'
                        ? t('admin.academic.statusPublished')
                        : pkg.status === 'ARCHIVED'
                          ? t('admin.academic.statusArchived')
                          : t('admin.academic.statusDraft')}
                    </span>

                    {pkg.hasUnpublishedChanges && (
                      <span className="badge-unpublished-changes">
                        ✎ {t('admin.academic.hasUnpublishedChanges')}
                      </span>
                    )}

                    <span className="yukcsca-tag">MATHEMATICS 2025</span>
                  </div>

                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                    CSCA 2025 Mathematics Package
                  </h3>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    {pkg.activeRevision
                      ? t('admin.academic.activeRevision', {
                          revision: pkg.activeRevision.revisionNumber,
                          date: new Date(pkg.activeRevision.publishedAt).toLocaleDateString(),
                        })
                      : t('admin.academic.noActiveRevision')}
                    {' · '}Draft Rev {pkg.draftRevision}
                  </p>
                </div>

                <button type="button" className="btn-secondary">
                  {t('admin.academic.editPackage')} →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
