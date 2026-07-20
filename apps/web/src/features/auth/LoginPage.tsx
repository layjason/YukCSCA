import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { login, status } = useAuth();

  if (status === 'loading') {
    return (
      <main className="center-card" aria-live="polite">
        {t('auth.restoringSession')}
      </main>
    );
  }
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <main className="page-shell">
      <section className="login-card">
        <p className="eyebrow">{t('login.eyebrow')}</p>
        <h1>{t('login.title')}</h1>
        <p>{t('login.description')}</p>
        <GoogleSignInButton onCredential={login} />
        <small>{t('login.privacy')}</small>
      </section>
    </main>
  );
}
