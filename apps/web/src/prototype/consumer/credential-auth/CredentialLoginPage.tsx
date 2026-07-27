import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_FIXTURE_EMAIL = 'wrong@example.test';

interface FieldErrors {
  email?: string;
  password?: string;
  invalid?: string;
}

interface CredentialLoginPageProps {
  googleControl?: ReactNode;
}

export function CredentialLoginPage({
  googleControl,
}: CredentialLoginPageProps = {}): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dispatch } = useConsumer();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = t('credential.login.errorEmailRequired');
    } else if (!EMAIL_RE.test(email)) {
      next.email = t('credential.login.errorEmailFormat');
    }
    if (!password) {
      next.password = t('credential.login.errorPasswordRequired');
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      // Discard password immediately after validation
      setPassword('');
      return;
    }

    // Fixture: invalid credentials
    if (email.trim().toLowerCase() === INVALID_FIXTURE_EMAIL) {
      setErrors({ invalid: t('credential.login.errorInvalidCredentials') });
      setPassword('');
      return;
    }

    const normalizedEmail = email.trim();
    setIsSubmitting(true);
    setPassword('');
    setErrors({});
    window.setTimeout(() => {
      dispatch({ type: 'CREDENTIAL_LOGIN_SUCCESS', email: normalizedEmail });
      navigate('/onboarding/role');
    }, 150);
  }

  return (
    <div className="credential-page">
      <span className="credential-preview-badge" aria-label={t('preview.badgeAria')}>
        {t('preview.badge')}
      </span>
      <h1>{t('credential.login.title')}</h1>
      <p className="credential-page-subtitle">{t('credential.login.description')}</p>

      {errors.invalid && (
        <div className="credential-alert credential-alert-error" role="alert">
          {errors.invalid}
        </div>
      )}

      <form className="credential-form" onSubmit={handleSubmit} noValidate>
        <div className="credential-field">
          <label htmlFor="login-email">{t('credential.login.email')}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            aria-invalid={!!errors.email}
            required
          />
          {errors.email && (
            <p id="login-email-error" className="credential-field-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="credential-field">
          <label htmlFor="login-password">{t('credential.login.password')}</label>
          <div className="credential-password-input">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={!!errors.password}
              required
            />
            <button
              type="button"
              className="credential-toggle-visibility"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('credential.login.hidePassword')
                  : t('credential.login.showPassword')
              }
            >
              {showPassword ? t('credential.hide') : t('credential.show')}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="credential-field-error" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className="credential-submit btn-primary" disabled={isSubmitting}>
          {t(isSubmitting ? 'credential.login.submitting' : 'credential.login.submit')}
        </button>
      </form>

      <p className="credential-alt-action">
        <Link to="/forgot-password">{t('credential.login.forgotPassword')}</Link>
      </p>

      <div className="credential-divider" role="separator" aria-label={t('credential.or')}>
        <span>{t('credential.or')}</span>
      </div>

      <div className="credential-google-section">
        {googleControl ?? (
          <>
            <p>{t('credential.login.googleHint')}</p>
            <Link to="/login" className="btn-secondary credential-google-link">
              {t('auth.continueWithGoogle')}
            </Link>
          </>
        )}
      </div>

      <p className="credential-alt-action">
        <Link to="/register">{t('credential.login.noAccount')}</Link>
      </p>
    </div>
  );
}
