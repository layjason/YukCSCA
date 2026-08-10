import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Generic destination for authenticated users who reached a route their role
 * cannot use (admin workspace for students, unknown roles at `/`, etc.).
 * Keep copy role-agnostic so the page can be reused for future access boundaries.
 */
export function UnsupportedRolePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const roleKey = user?.role ? `roles.${user.role}` : null;
  const roleLabel = roleKey ? t(roleKey) : t('unsupported.unknownRole');

  const continuePath = destinationForRole(user?.role);

  const handleContinue = () => {
    navigate(continuePath, { replace: true });
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="unsupported-shell" id="main-content">
      <section className="unsupported-card">
        <p className="eyebrow">{t('unsupported.eyebrow')}</p>
        <h1 className="unsupported-title">{t('unsupported.title')}</h1>
        <p className="unsupported-body">{t('unsupported.description', { role: roleLabel })}</p>
        <div className="unsupported-actions">
          <button type="button" className="btn-primary unsupported-action" onClick={handleContinue}>
            {t('unsupported.continue')}
          </button>
          <button
            type="button"
            className="btn-secondary unsupported-action"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? t('unsupported.signingOut') : t('unsupported.signOut')}
          </button>
        </div>
      </section>
    </main>
  );
}

function destinationForRole(role: string | undefined): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/academic-packages';
    case 'STUDENT':
      return '/app/learn';
    case 'UNASSIGNED':
      return '/onboarding/role';
    default:
      // PARENT, TUTOR, missing role — public home is the safe shared landing.
      return '/';
  }
}
