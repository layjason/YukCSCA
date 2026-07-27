import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import { RouteFocusManager } from '@/app/focus/RouteFocusManager';
import { parentNavRoutes, parentMobileNavRoutes } from '@/app/routes';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function ParentShellLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  return (
    <div className="parent-shell">
      <nav className="parent-nav" aria-label={t('parent.nav.label')}>
        <div className="parent-nav-brand">
          <span className="parent-nav-logo" aria-hidden="true">
            Y
          </span>
          <span className="parent-nav-name">YukCSCA</span>
        </div>
        <ul className="parent-nav-list" role="list">
          {parentNavRoutes.map((route) => (
            <li key={route.id}>
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  isActive ? 'parent-nav-item parent-nav-item-active' : 'parent-nav-item'
                }
              >
                <span className="parent-nav-icon" aria-hidden="true">
                  {getParentNavIcon(route.id)}
                </span>
                <span className="parent-nav-item-label">{t(route.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="app-nav-footer">
          <span className="app-nav-user">
            {state.parentProfile?.name ?? state.credentialSession.displayEmail}
          </span>
          <button
            type="button"
            className="nav-logout-btn"
            onClick={() => {
              dispatch({ type: 'PREVIEW_RESTART' });
              navigate('/');
            }}
          >
            {t('shell.exitPreview')}
          </button>
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
          const isActive = location.pathname.startsWith(route.path);
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
                {getParentNavIcon(route.id)}
              </span>
              <span className="parent-bottom-label">{t(route.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function getParentNavIcon(id: string): string {
  switch (id) {
    case 'parent-home':
      return '\u2302';
    case 'parent-family':
      return '\u2661';
    case 'parent-reports':
      return '\u2261';
    case 'parent-purchases':
      return '\u25C7';
    case 'parent-account':
      return '\u25CB';
    default:
      return '\u2022';
  }
}
