import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function AuthGuard(): React.JSX.Element {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <main className="center-card">
        <p aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
        </p>
      </main>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
