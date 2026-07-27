import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';
import { mobileMoreRoutes, mobilePrimaryNavRoutes, primaryNavRoutes } from '@/app/routes';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function AppShellLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { state: consumerState, dispatch: consumerDispatch } = useConsumer();
  const location = useLocation();
  const navigate = useNavigate();
  const isCredentialPreview =
    consumerState.credentialSession.status === 'active' &&
    consumerState.credentialSession.roleIntent === 'student';

  const activeRoute = primaryNavRoutes.find((r) => location.pathname.startsWith(r.path));
  const moreRouteIsActive = mobileMoreRoutes.some((route) =>
    location.pathname.startsWith(route.path),
  );

  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label={t('shell.navLabel')}>
        <div className="app-nav-brand">
          <span className="app-nav-logo" aria-hidden="true">
            Y
          </span>
          <span className="app-nav-name">YukCSCA</span>
        </div>
        <ul className="app-nav-list" role="list">
          {primaryNavRoutes.map((route) => (
            <li key={route.id}>
              <NavLink
                to={route.path}
                className={({ isActive }) => (isActive ? 'nav-item nav-item-active' : 'nav-item')}
              >
                <span className="nav-item-icon" aria-hidden="true">
                  {getNavIcon(route.id)}
                </span>
                <span className="nav-item-label">{t(route.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="app-nav-footer">
          <span className="app-nav-user">
            {isCredentialPreview
              ? consumerState.credentialSession.displayEmail
              : (user?.displayName ?? t('shell.fallbackName'))}
          </span>
          <button
            type="button"
            className="nav-logout-btn"
            onClick={() => {
              if (isCredentialPreview) {
                consumerDispatch({ type: 'PREVIEW_RESTART' });
                navigate('/');
                return;
              }
              void logout();
            }}
          >
            {isCredentialPreview ? t('shell.exitPreview') : t('shell.logout')}
          </button>
        </div>
      </nav>

      <div className="app-content-wrapper">
        <header className="app-content-header">
          <PreviewBadge />
        </header>
        <main id="main-content" className="app-content">
          <RouteFocusManager />
          <Outlet />
        </main>
      </div>

      <nav className="app-bottom-nav" aria-label={t('shell.navLabel')}>
        {mobilePrimaryNavRoutes.map((route) => (
          <NavLink
            key={route.id}
            to={route.path}
            className={({ isActive }) => {
              const routeIsActive = isActive || (route.id === 'more' && moreRouteIsActive);
              return routeIsActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item';
            }}
            aria-current={
              activeRoute?.id === route.id || (route.id === 'more' && moreRouteIsActive)
                ? 'page'
                : undefined
            }
          >
            <span className="nav-item-icon" aria-hidden="true">
              {getNavIcon(route.id)}
            </span>
            <span className="bottom-nav-label">{t(route.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function getNavIcon(id: string): string {
  switch (id) {
    case 'today':
      return '\u25C9';
    case 'learn':
      return '\u25A1';
    case 'practice':
      return '\u2713';
    case 'mock-exams':
      return '\u23F1';
    case 'progress':
      return '\u25B3';
    case 'profile':
      return '\u25CB';
    case 'more':
      return '\u2630';
    default:
      return '\u2022';
  }
}
