import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function AdminGuard(): React.JSX.Element {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <main className="center-card" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
      </main>
    );
  }

  if (status === 'authenticated' && user?.role === 'ADMIN') {
    return <Outlet />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/unsupported" replace />;
  }

  return <Navigate to="/login" replace />;
}
