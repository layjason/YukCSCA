import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import GoogleSignInButton from '@/features/auth/GoogleSignInButton';
import { RegisterPage } from '@/prototype/consumer/credential-auth/RegisterPage';

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
    <RegisterPage
      googleControl={
        <div className="credential-google-production">
          <p className="credential-production-label">{t('credential.register.googleHint')}</p>
          <GoogleSignInButton onCredential={login} />
        </div>
      }
    />
  );
}
