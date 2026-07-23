import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';

const ONBOARDING_STEPS = [
  { path: '/onboarding/student', key: 'onboarding.steps.activation' },
  { path: '/onboarding/student/goals', key: 'onboarding.steps.goals' },
  { path: '/onboarding/student/subjects', key: 'onboarding.steps.subjects' },
  { path: '/onboarding/student/diagnostic', key: 'onboarding.steps.diagnostic' },
  { path: '/onboarding/student/diagnostic/result', key: 'onboarding.steps.diagnostic' },
  { path: '/onboarding/student/plan-review', key: 'onboarding.steps.plan' },
];

const VISIBLE_STEPS = [
  { path: '/onboarding/student/goals', key: 'onboarding.steps.goals' },
  { path: '/onboarding/student/subjects', key: 'onboarding.steps.subjects' },
  { path: '/onboarding/student/diagnostic', key: 'onboarding.steps.diagnostic' },
  { path: '/onboarding/student/plan-review', key: 'onboarding.steps.plan' },
];

export function OnboardingLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const isActivation = location.pathname === '/onboarding/student';
  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.path === location.pathname);
  const currentVisibleIndex = VISIBLE_STEPS.findIndex(
    (s) => s.key === ONBOARDING_STEPS[currentStepIndex]?.key,
  );

  return (
    <div className="onboarding-layout">
      <header className="onboarding-header">{!isActivation && <PreviewBadge />}</header>
      {!isActivation && (
        <nav className="onboarding-steps" aria-label={t('onboarding.progressLabel')}>
          <ol>
            {VISIBLE_STEPS.map((step, i) => (
              <li
                key={step.path}
                aria-current={i === currentVisibleIndex ? 'step' : undefined}
                className={
                  i < currentVisibleIndex
                    ? 'step-complete'
                    : i === currentVisibleIndex
                      ? 'step-current'
                      : 'step-upcoming'
                }
              >
                {t(step.key)}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <main id="main-content" className="onboarding-main">
        <RouteFocusManager />
        <Outlet />
      </main>
    </div>
  );
}
