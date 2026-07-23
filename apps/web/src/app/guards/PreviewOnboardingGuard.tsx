import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import type { OnboardingStep } from '@/prototype/student/types';

const STEP_ORDER: OnboardingStep[] = [
  'goals',
  'subjects',
  'diagnostic',
  'result',
  'plan',
  'complete',
];

const ROUTE_STEP: Record<string, OnboardingStep> = {
  '/onboarding/student/goals': 'goals',
  '/onboarding/student/subjects': 'subjects',
  '/onboarding/student/diagnostic': 'diagnostic',
  '/onboarding/student/diagnostic/result': 'result',
  '/onboarding/student/plan-review': 'plan',
};

function stepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

export function PreviewOnboardingGuard(): React.JSX.Element {
  const { state } = usePrototype();
  const location = useLocation();

  const requiredStep = ROUTE_STEP[location.pathname];
  if (!requiredStep) {
    return <Outlet />;
  }

  if (state.onboardingStep === 'complete') {
    return <Navigate to="/app/today" replace />;
  }

  const currentStepIndex = stepIndex(state.onboardingStep);
  const requiredStepIndex = stepIndex(requiredStep);

  if (requiredStepIndex > currentStepIndex) {
    const targetStep = STEP_ORDER[currentStepIndex];
    const targetPath = Object.entries(ROUTE_STEP).find(([, step]) => step === targetStep)?.[0];
    return <Navigate to={targetPath ?? '/onboarding/student/goals'} replace />;
  }

  return <Outlet />;
}
