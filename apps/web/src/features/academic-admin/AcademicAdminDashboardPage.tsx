import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicPackageList } from './components/AcademicPackageList';
import { createAcademicPackage, listAcademicPackages } from './api/academicAdminApi';
import type { AcademicPackageSummary } from './types';

export function AcademicAdminDashboardPage(): React.JSX.Element {
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
        setError(err instanceof Error ? err.message : 'Failed to load packages');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCreatePackage = async () => {
    setIsLoading(true);
    try {
      const created = await createAcademicPackage();
      navigate(`/admin/academic-packages/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package');
      setIsLoading(false);
    }
  };

  const handleSelectPackage = (id: string) => {
    navigate(`/admin/academic-packages/${id}`);
  };

  if (error) {
    return (
      <main className="app-content">
        <div className="feedback-danger" role="alert">
          <p style={{ margin: 0, fontWeight: 650 }}>{error}</p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: 'var(--space-sm)' }}
            onClick={() => window.location.reload()}
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-content" style={{ maxWidth: '1080px' }}>
      <AcademicPackageList
        packages={packages}
        isLoading={isLoading}
        onCreatePackage={handleCreatePackage}
        onSelectPackage={handleSelectPackage}
      />
    </main>
  );
}

export default AcademicAdminDashboardPage;
