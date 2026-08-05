import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AcademicPackageEditor } from './components/AcademicPackageEditor';
import { getAcademicPackage } from './api/academicAdminApi';
import type { AcademicPackage } from './types';

export function AcademicPackageDetailPage(): React.JSX.Element {
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
        setError(err instanceof Error ? err.message : 'Failed to load package detail');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="center-card" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <main className="app-content">
        <div className="feedback-danger" role="alert">
          <p style={{ margin: 0, fontWeight: 650 }}>{error || 'Package not found'}</p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: 'var(--space-sm)' }}
            onClick={() => navigate('/admin/academic-packages')}
          >
            Return to Academic Packages List
          </button>
        </div>
      </main>
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
