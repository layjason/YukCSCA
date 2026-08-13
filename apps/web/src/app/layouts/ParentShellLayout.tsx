import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';
import { isRouteActive, parentNavRoutes, parentMobileNavRoutes } from '@/app/routes';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { NavCollapseIcon, ShellNavIcon, SignOutIcon } from '@/app/layouts/navIcons';
import { useDesktopNavExpanded } from '@/app/layouts/useDesktopNavExpanded';

export function ParentShellLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();
  const { expanded, toggle } = useDesktopNavExpanded();
  const displayName = state.parentProfile?.name ?? state.credentialSession.displayEmail;
  const signOutLabel = t('shell.exitPreview');

  return (
    <div className={expanded ? 'parent-shell' : 'parent-shell parent-shell-nav-collapsed'}>
      <nav
        className={expanded ? 'parent-nav parent-nav-expanded' : 'parent-nav parent-nav-collapsed'}
        aria-label={t('parent.nav.label')}
      >
        <div className="parent-nav-brand">
          <span className="parent-nav-logo" aria-hidden="true">
            Y
          </span>
          <span className="parent-nav-name">YukCSCA</span>
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
        <ul className="parent-nav-list" role="list">
          {parentNavRoutes.map((route) => (
            <li key={route.id}>
              <NavLink
                to={route.path}
                className={
                  isRouteActive(route, location.pathname)
                    ? 'parent-nav-item parent-nav-item-active'
                    : 'parent-nav-item'
                }
                aria-current={isRouteActive(route, location.pathname) ? 'page' : undefined}
                aria-label={expanded ? undefined : t(route.labelKey)}
                title={expanded ? undefined : t(route.labelKey)}
              >
                <span className="parent-nav-icon" aria-hidden="true">
                  <ShellNavIcon id={route.id} />
                </span>
                <span className="parent-nav-item-label">{t(route.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="app-nav-footer">
          {expanded ? (
            <>
              <span className="app-nav-user" title={displayName}>
                {displayName}
              </span>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={() => {
                  dispatch({ type: 'PREVIEW_RESTART' });
                  navigate('/');
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

      <div className="parent-content-wrapper">
        <header className="parent-content-header">
          <PreviewBadge />
        </header>
        <main id="main-content" className="parent-content">
          <RouteFocusManager />
          <Outlet />
        </main>
      </div>

      <nav className="parent-bottom-nav" aria-label={t('parent.nav.label')}>
        {parentMobileNavRoutes.map((route) => {
          const isActive = isRouteActive(route, location.pathname);
          return (
            <NavLink
              key={route.id}
              to={route.path}
              className={
                isActive ? 'parent-bottom-item parent-bottom-item-active' : 'parent-bottom-item'
              }
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="parent-nav-icon" aria-hidden="true">
                <ShellNavIcon id={route.id} />
              </span>
              <span className="parent-bottom-label">{t(route.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
