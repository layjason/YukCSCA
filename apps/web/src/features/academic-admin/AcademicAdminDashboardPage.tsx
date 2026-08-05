import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AcademicPackageList } from './components/AcademicPackageList';
import { createAcademicPackage, listAcademicPackages } from './api/academicAdminApi';
import type { AcademicPackageSummary } from './types';
import './academic-admin.css';

export function AcademicAdminDashboardPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<AcademicPackageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listAcademicPackages()
      .then((data) => {
        if (!active) return;
        setPackages(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : t('admin.academic.loadFailed'));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const handleCreatePackage = async () => {
    setIsLoading(true);
    try {
      const created = await createAcademicPackage();
      navigate(`/admin/academic-packages/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.academic.createFailed'));
      setIsLoading(false);
    }
  };

  const handleSelectPackage = (id: string) => {
    navigate(`/admin/academic-packages/${id}`);
  };

  if (error) {
    return (
      <div className="feedback-danger admin-feedback" role="alert">
        <p className="admin-feedback-message">{error}</p>
        <button
          type="button"
          className="btn-secondary admin-feedback-retry"
          onClick={() => window.location.reload()}
        >
          {t('admin.academic.retryLoading')}
        </button>
      </div>
    );
  }

  return (
    <AcademicPackageList
      packages={packages}
      isLoading={isLoading}
      onCreatePackage={handleCreatePackage}
      onSelectPackage={handleSelectPackage}
    />
  );
}

export default AcademicAdminDashboardPage;
