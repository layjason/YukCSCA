import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function StudentExperienceGuard(): React.JSX.Element {
  const { status, user } = useAuth();
  const { state } = useConsumer();

  const isCredentialStudent =
    state.credentialSession.status === 'active' && state.credentialSession.roleIntent === 'student';

  if (isCredentialStudent || (status === 'authenticated' && user?.role === 'STUDENT')) {
    return <Outlet />;
  }

  if (status === 'loading') {
    return (
      <main className="center-card" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
      </main>
    );
  }

  if (status === 'authenticated' && user?.role === 'UNASSIGNED') {
    return <Navigate to="/onboarding/role" replace />;
  }

  return <Navigate to="/login" replace />;
}
