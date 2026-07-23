import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function ProfilePage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="page-content">
      <h1>{t('profile.title')}</h1>
      <section className="profile-identity">
        <p className="preview-contextual production-label">{t('profile.productionLabel')}</p>
        <dl>
          <div>
            <dt>{t('profile.name')}</dt>
            <dd>{user?.displayName ?? t('shell.fallbackName')}</dd>
          </div>
          <div>
            <dt>{t('profile.email')}</dt>
            <dd>{user?.email ?? ''}</dd>
          </div>
          <div>
            <dt>{t('profile.role')}</dt>
            <dd>{t(`roles.${user?.role ?? 'STUDENT'}`)}</dd>
          </div>
        </dl>
      </section>
      <p>{t('profile.identityNote')}</p>
      <p className="task-meta">{t('profile.editUnavailable')}</p>
      <nav className="profile-links" aria-label={t('profile.settingsLabel')}>
        <ul role="list">
          <li>
            <Link to="/app/profile/languages">{t('nav.languages')}</Link>
          </li>
          <li>
            <Link to="/app/profile/family">{t('nav.family')}</Link>
          </li>
          <li>
            <Link to="/app/profile/access">{t('nav.access')}</Link>
          </li>
        </ul>
      </nav>
      <button type="button" className="btn-secondary profile-logout" onClick={() => void logout()}>
        {t('shell.logout')}
      </button>
    </div>
  );
}
