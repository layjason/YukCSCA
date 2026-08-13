import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';
import {
  isRouteActive,
  mobileMoreRoutes,
  mobilePrimaryNavRoutes,
  primaryNavRoutes,
} from '@/app/routes';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { NavCollapseIcon, ShellNavIcon, SignOutIcon } from '@/app/layouts/navIcons';
import { useDesktopNavExpanded } from '@/app/layouts/useDesktopNavExpanded';
import { useStudentPreferredName } from '@/shared/identity/preferredGivenName';

export function AppShellLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { state: consumerState, dispatch: consumerDispatch } = useConsumer();
  const location = useLocation();
  const navigate = useNavigate();
  const { expanded, toggle } = useDesktopNavExpanded();
  const isCredentialPreview =
    consumerState.credentialSession.status === 'active' &&
    consumerState.credentialSession.roleIntent === 'student';

  const activeRoute = primaryNavRoutes.find((route) => isRouteActive(route, location.pathname));
  const moreRouteIsActive = mobileMoreRoutes.some((route) =>
    isRouteActive(route, location.pathname),
  );
  const preferredName = useStudentPreferredName();
  const footerName = isCredentialPreview
    ? consumerState.credentialSession.displayEmail
    : preferredName;
  const signOutLabel = isCredentialPreview ? t('shell.exitPreview') : t('shell.logout');

  return (
    <div className={expanded ? 'app-shell' : 'app-shell app-shell-nav-collapsed'}>
      <nav
        className={expanded ? 'app-nav app-nav-expanded' : 'app-nav app-nav-collapsed'}
        aria-label={t('shell.navLabel')}
      >
        <div className="app-nav-brand">
          <span className="app-nav-logo" aria-hidden="true">
            Y
          </span>
          <span className="app-nav-name">YukCSCA</span>
          {expanded ? (
            <button
              type="button"
              className="app-nav-toggle"
              onClick={toggle}
              aria-pressed={true}
              aria-label={t('shell.collapseNav')}
              title={t('shell.collapseNav')}
            >
              <NavCollapseIcon expanded />
            </button>
          ) : null}
        </div>
        <ul className="app-nav-list" role="list">
          {primaryNavRoutes.map((route) => (
            <li key={route.id}>
              <NavLink
                to={route.path}
                className={
                  isRouteActive(route, location.pathname) ? 'nav-item nav-item-active' : 'nav-item'
                }
                aria-current={isRouteActive(route, location.pathname) ? 'page' : undefined}
                aria-label={expanded ? undefined : t(route.labelKey)}
                title={expanded ? undefined : t(route.labelKey)}
              >
                <span className="nav-item-icon" aria-hidden="true">
                  <ShellNavIcon id={route.id} />
                </span>
                <span className="nav-item-label">{t(route.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="app-nav-footer">
          {expanded ? (
            <>
              {footerName ? (
                <span className="app-nav-user" title={footerName}>
                  {footerName}
                </span>
              ) : null}
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
                aria-label={signOutLabel}
                title={signOutLabel}
              >
                <SignOutIcon />
                <span className="nav-logout-label">{signOutLabel}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="app-nav-toggle"
              onClick={toggle}
              aria-pressed={false}
              aria-label={t('shell.expandNav')}
              title={t('shell.expandNav')}
            >
              <NavCollapseIcon expanded={false} />
            </button>
          )}
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
            className={() => {
              const routeIsActive =
                isRouteActive(route, location.pathname) ||
                (route.id === 'more' && moreRouteIsActive);
              return routeIsActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item';
            }}
            aria-current={
              activeRoute?.id === route.id || (route.id === 'more' && moreRouteIsActive)
                ? 'page'
                : undefined
            }
          >
            <span className="nav-item-icon" aria-hidden="true">
              <ShellNavIcon id={route.id} />
            </span>
            <span className="bottom-nav-label">{t(route.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
