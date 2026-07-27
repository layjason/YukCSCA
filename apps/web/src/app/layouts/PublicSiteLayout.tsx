import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicNavRoutes } from '@/app/routes';

const languageOptions = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
];

export function PublicSiteLayout(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand" aria-label={t('public.brand')}>
            YukCSCA
          </Link>

          <nav className="public-nav-desktop" aria-label={t('public.nav.label')}>
            {publicNavRoutes.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="public-nav-link"
                aria-current={
                  item.path === '/'
                    ? location.pathname === item.path
                      ? 'page'
                      : undefined
                    : location.pathname.startsWith(item.path)
                      ? 'page'
                      : undefined
                }
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="public-header-actions">
            <label className="public-lang-select" htmlFor="public-lang">
              <span className="sr-only">{t('public.languageSelect')}</span>
              <select
                id="public-lang"
                value={i18n.language}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/login" className="btn-secondary public-auth-btn">
              {t('public.nav.signIn')}
            </Link>
            <Link to="/register" className="btn-primary public-auth-btn">
              {t('public.nav.createAccount')}
            </Link>
            <button
              className="public-mobile-toggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">{t('public.nav.toggleMenu')}</span>
              <span className="hamburger-icon" aria-hidden="true">
                {mobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="public-mobile-menu"
            className="public-nav-mobile"
            aria-label={t('public.nav.label')}
          >
            {publicNavRoutes.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="public-nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="public-nav-mobile-actions">
              <Link to="/login" className="btn-secondary" onClick={() => setMobileMenuOpen(false)}>
                {t('public.nav.signIn')}
              </Link>
              <Link to="/register" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>
                {t('public.nav.createAccount')}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <span className="public-footer-brand">YukCSCA</span>
          <nav aria-label={t('public.footer.label')}>
            <Link to="/privacy">{t('public.footer.privacy')}</Link>
            <Link to="/terms">{t('public.footer.terms')}</Link>
            <Link to="/support">{t('public.footer.support')}</Link>
          </nav>
          <p className="public-footer-note">{t('public.footer.note')}</p>
        </div>
      </footer>
    </div>
  );
}
