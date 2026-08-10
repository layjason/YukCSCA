import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { mobileMoreRoutes } from '@/app/routes';

/**
 * Production-safe More destinations: only implemented student-settings routes.
 * Preview-only items (mock exams, family, access) stay out of the production shell
 * until their vertical slices ship — avoids More → onboarding/profile bounce.
 */
export function StudentMorePage(): React.JSX.Element {
  const { t } = useTranslation();
  const destinations = mobileMoreRoutes.filter(
    (route) => route.availability === 'implemented' && route.access === 'student-settings',
  );

  return (
    <div className="page-content">
      <h1>{t('more.title')}</h1>
      <p>{t('more.description')}</p>
      <nav className="more-links" aria-label={t('more.navLabel')}>
        <ul role="list">
          {destinations.map((route) => (
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
