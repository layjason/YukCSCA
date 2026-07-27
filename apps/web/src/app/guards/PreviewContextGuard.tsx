import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

interface PreviewContextGuardProps {
  scope?: 'persona' | 'parent' | 'commerce';
}

export function PreviewContextGuard({
  scope = 'persona',
}: PreviewContextGuardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = useConsumer();

  const hasStudentPersona =
    state.credentialSession.status === 'active' && state.credentialSession.roleIntent === 'student';
  const hasParentPersona =
    state.credentialSession.roleIntent === 'parent' &&
    state.parentOnboardingStep === 'complete' &&
    state.parentProfile !== null;
  const hasContext =
    scope === 'parent'
      ? hasParentPersona
      : scope === 'commerce'
        ? hasStudentPersona ||
          (hasParentPersona && state.familyLinkStatus === 'active' && state.linkedStudent !== null)
        : hasStudentPersona || hasParentPersona;

  if (!hasContext) {
    return (
      <main className="center-card preview-context-guard">
        <h1>{t('guard.previewContext.title')}</h1>
        <p>{t('guard.previewContext.description')}</p>
        <div className="preview-context-guard-actions">
          <Link to="/register" className="btn-primary">
            {t('guard.previewContext.startRole')}
          </Link>
          <Link to="/login" className="btn-secondary">
            {t('public.nav.signIn')}
          </Link>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
