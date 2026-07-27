import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { HomePage } from '@/prototype/consumer/public/HomePage';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function RootDecisionPage(): React.JSX.Element {
  const { status, user } = useAuth();
  const { state: consumerState } = useConsumer();
  const { state: studentPreviewState } = usePrototype();

  if (status === 'loading') {
    return (
      <div className="center-card" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'authenticated') {
    if (user?.role === 'UNASSIGNED') {
      if (
        consumerState.credentialSession.roleIntent === 'parent' &&
        consumerState.parentOnboardingStep === 'complete' &&
        consumerState.parentProfile
      ) {
        return <Navigate to="/parent/home" replace />;
      }
      if (
        consumerState.credentialSession.roleIntent === 'parent' &&
        consumerState.parentOnboardingStep
      ) {
        return <Navigate to="/onboarding/parent" replace />;
      }
      return <Navigate to="/onboarding/role" replace />;
    }
    if (user?.role === 'STUDENT') {
      return (
        <Navigate
          to={
            studentPreviewState.onboardingStep === 'complete'
              ? '/app/today'
              : '/onboarding/student/goals'
          }
          replace
        />
      );
    }
    return <Navigate to="/unsupported" replace />;
  }

  if (consumerState.credentialSession.status === 'active') {
    if (consumerState.credentialSession.roleIntent === 'student') {
      return (
        <Navigate
          to={
            studentPreviewState.onboardingStep === 'complete'
              ? '/app/today'
              : '/onboarding/student/goals'
          }
          replace
        />
      );
    }
    if (
      consumerState.credentialSession.roleIntent === 'parent' &&
      consumerState.parentOnboardingStep === 'complete' &&
      consumerState.parentProfile
    ) {
      return <Navigate to="/parent/home" replace />;
    }
    return <Navigate to="/onboarding/role" replace />;
  }

  return <HomePage />;
}
