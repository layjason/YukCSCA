import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import GoogleSignInButton from '@/features/auth/GoogleSignInButton';
import { CredentialLoginPage } from '@/prototype/consumer/credential-auth/CredentialLoginPage';

export function AccountEntryPage(): React.JSX.Element {
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
    <CredentialLoginPage
      googleControl={
        <div className="credential-google-production">
          <p className="credential-production-label">{t('credential.login.googleHint')}</p>
          <GoogleSignInButton onCredential={login} />
        </div>
      }
    />
  );
}
