import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';
import { adminMobileNavRoutes, adminNavRoutes, isRouteActive } from '@/app/routes';
import { NavCollapseIcon, ShellNavIcon, SignOutIcon } from '@/app/layouts/navIcons';
import { useDesktopNavExpanded } from '@/app/layouts/useDesktopNavExpanded';

export function AdminShellLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const { expanded, toggle } = useDesktopNavExpanded();
  const displayName = user?.displayName ?? t('admin.shell.fallbackName');

  return (
    <div className={expanded ? 'admin-shell' : 'admin-shell admin-shell-nav-collapsed'}>
      <nav
        className={
          expanded
            ? 'admin-shell-nav admin-shell-nav-expanded'
            : 'admin-shell-nav admin-shell-nav-collapsed'
        }
        aria-label={t('admin.shell.navLabel')}
      >
        <div className="admin-shell-brand">
          <span className="admin-shell-logo" aria-hidden="true">
            Y
          </span>
          <div className="admin-shell-brand-text">
            <span className="admin-shell-name">YukCSCA</span>
            <span className="admin-shell-role">{t('admin.shell.workspace')}</span>
          </div>
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

        <ul className="admin-shell-nav-list" role="list">
          {adminNavRoutes.map((route) => {
            const active = isRouteActive(route, location.pathname);
            return (
              <li key={route.id}>
                <NavLink
                  to={route.path}
                  className={
                    active
                      ? 'admin-shell-nav-item admin-shell-nav-item-active'
                      : 'admin-shell-nav-item'
                  }
                  aria-current={active ? 'page' : undefined}
                  aria-label={expanded ? undefined : t(route.labelKey)}
                  title={expanded ? undefined : t(route.labelKey)}
                >
                  <span className="admin-shell-nav-icon" aria-hidden="true">
                    <ShellNavIcon id={route.id} />
                  </span>
                  <span className="admin-shell-nav-label">{t(route.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="admin-shell-footer">
          {expanded ? (
            <>
              <div className="admin-shell-user-block">
                <span className="admin-shell-user-label">{t('admin.shell.signedInAs')}</span>
                <span className="admin-shell-user" title={displayName}>
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={() => void logout()}
                aria-label={t('shell.logout')}
                title={t('shell.logout')}
              >
                <SignOutIcon />
                <span className="nav-logout-label">{t('shell.logout')}</span>
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

      <div className="admin-shell-content-wrapper">
        <main id="main-content" className="admin-shell-content">
          <RouteFocusManager />
          <Outlet />
        </main>
      </div>

      <nav className="admin-shell-bottom-nav" aria-label={t('admin.shell.navLabel')}>
        {adminMobileNavRoutes.map((route) => {
          const active = isRouteActive(route, location.pathname);
          return (
            <NavLink
              key={route.id}
              to={route.path}
              className={
                active
                  ? 'admin-shell-bottom-item admin-shell-bottom-item-active'
                  : 'admin-shell-bottom-item'
              }
              aria-current={active ? 'page' : undefined}
            >
              <span className="admin-shell-nav-icon" aria-hidden="true">
                <ShellNavIcon id={route.id} />
              </span>
              <span className="admin-shell-bottom-label">{t(route.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
