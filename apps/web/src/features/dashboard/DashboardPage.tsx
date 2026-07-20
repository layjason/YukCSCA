import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';

export default function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  return (
    <main className="page-shell">
      <section className="dashboard-card">
        <p className="eyebrow">{t('dashboard.title')}</p>
        <h1>
          {t('dashboard.welcome', {
            name: user?.displayName ?? user?.email ?? t('dashboard.fallbackName'),
          })}
        </h1>
        <p>{t('dashboard.onboarding')}</p>
        <dl>
          <div>
            <dt>{t('dashboard.email')}</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>{t('dashboard.role')}</dt>
            <dd>{t(`roles.${user?.role ?? 'UNASSIGNED'}`)}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => void logout()}>
          {t('dashboard.logout')}
        </button>
      </section>
    </main>
  );
}
