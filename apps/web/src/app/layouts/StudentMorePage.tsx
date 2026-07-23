import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { mobileMoreRoutes } from '@/app/routes';

export function StudentMorePage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="page-content">
      <h1>{t('more.title')}</h1>
      <p>{t('more.description')}</p>
      <nav className="more-links" aria-label={t('more.navLabel')}>
        <ul role="list">
          {mobileMoreRoutes.map((route) => (
            <li key={route.id}>
              <Link to={route.path}>
                <strong>{t(route.labelKey)}</strong>
                <span>{t(`more.destinations.${route.id}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
