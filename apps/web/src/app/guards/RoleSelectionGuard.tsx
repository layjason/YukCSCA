import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function RoleSelectionGuard(): React.JSX.Element {
  const { status, user } = useAuth();
  const { state } = useConsumer();

  if (state.credentialSession.status === 'active') {
    return <Outlet />;
  }

  if (status === 'authenticated' && user?.role === 'UNASSIGNED') {
    return <Outlet />;
  }

  if (status === 'loading') {
    return (
      <main className="center-card">
        <p aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
        </p>
      </main>
    );
  }

  return <Navigate to="/" replace />;
}
