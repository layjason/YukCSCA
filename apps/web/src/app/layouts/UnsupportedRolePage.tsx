import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';

export function UnsupportedRolePage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <main className="page-shell" id="main-content">
      <section className="center-card-inner">
        <p className="eyebrow">{t('unsupported.eyebrow')}</p>
        <h1>{t('unsupported.title')}</h1>
        <p>{t('unsupported.description', { role: user?.role ?? '' })}</p>
        <button type="button" className="btn-primary" onClick={() => void logout()}>
          {t('shell.logout')}
        </button>
      </section>
    </main>
  );
}
