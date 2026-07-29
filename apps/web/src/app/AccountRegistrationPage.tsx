import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import GoogleSignInButton from '@/features/auth/GoogleSignInButton';
import { AccountRegistrationForm } from '@/features/auth/AccountRegistrationForm';

export function AccountRegistrationPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { login, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="center-card" aria-live="polite">
        {t('auth.restoringSession')}
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <AccountRegistrationForm
      googleControl={
        <div className="credential-google-production">
          <GoogleSignInButton onCredential={login} />
        </div>
      }
    />
  );
}
