import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AcademicPackageEditor } from './components/AcademicPackageEditor';
import { getAcademicPackage } from './api/academicAdminApi';
import type { AcademicPackage } from './types';
import './academic-admin.css';

export function AcademicPackageDetailPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<AcademicPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    void getAcademicPackage(id)
      .then((data) => {
        if (!active) return;
        setPkg(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : t('admin.academic.loadDetailFailed'));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="admin-loading" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
        <p className="admin-muted">{t('admin.academic.loadingPackage')}</p>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="feedback-danger admin-feedback" role="alert">
        <p className="admin-feedback-message">{error || t('admin.academic.packageNotFound')}</p>
        <button
          type="button"
          className="btn-secondary admin-feedback-retry"
          onClick={() => navigate('/admin/academic-packages')}
        >
          {t('admin.academic.returnToList')}
        </button>
      </div>
    );
  }

  return (
    <AcademicPackageEditor
      initialPackage={pkg}
      onBackToList={() => navigate('/admin/academic-packages')}
    />
  );
}

export default AcademicPackageDetailPage;
