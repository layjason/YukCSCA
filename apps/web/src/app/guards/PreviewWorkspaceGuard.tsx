import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function PreviewWorkspaceGuard(): React.JSX.Element {
  const { state } = usePrototype();
  const location = useLocation();

  if (state.onboardingStep !== 'complete') {
    return (
      <Navigate
        to="/onboarding/student/goals"
        replace
        state={{
          previewStateLost: true,
          requestedPath: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}
