import { Navigate, Outlet } from 'react-router-dom';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function ParentOnboardingGuard(): React.JSX.Element {
  const { state } = useConsumer();

  if (state.credentialSession.roleIntent !== 'parent' || state.parentOnboardingStep === null) {
    return <Navigate to="/onboarding/role" replace />;
  }

  if (state.parentOnboardingStep === 'complete' && state.parentProfile) {
    return <Navigate to="/parent/home" replace />;
  }

  return <Outlet />;
}
