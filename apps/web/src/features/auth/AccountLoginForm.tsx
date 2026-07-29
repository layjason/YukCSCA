import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { ApiError } from '@/shared/api/httpClient';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountLoginFormProps {
  googleControl?: ReactNode;
}

export function AccountLoginForm({ googleControl }: AccountLoginFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { loginCredentials } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = t('credential.register.errorEmailRequired', 'Email address is required.');
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = t('credential.register.errorEmailFormat', 'Enter a valid email address.');
    }

    if (!password) {
      errors.password = t('credential.verify.errorPasswordRequired', 'Password is required.');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await loginCredentials({ email: trimmedEmail, password });
      // Password is cleared on completion
      setPassword('');
    } catch (err) {
      setPassword('');

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError(t('credential.login.invalidCredentials', 'Invalid email or password.'));
        } else if (err.status === 429) {
          setServerError(
            t(
              'credential.login.rateLimitError',
              'Too many requests. Please try again in {{seconds}} seconds.',
              { seconds: 60 },
            ),
          );
        } else {
          setServerError(
            t('auth.loginFailed', 'Login failed. Check your credentials and try again.'),
          );
        }
      } else {
        setServerError(
          t('auth.loginFailed', 'Login failed. Check your credentials and try again.'),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="credential-page">
      <div className="credential-card">
        <h1>{t('credential.login.title', 'Sign in')}</h1>
        <p className="credential-description">
          {t('credential.login.description', 'Sign in with your email and password.')}
        </p>

        {serverError && (
          <div className="credential-alert credential-alert-error" role="alert">
            <p>{serverError}</p>
          </div>
        )}

        <form className="credential-form" onSubmit={handleSubmit} noValidate>
          <div className="credential-field">
            <label htmlFor="login-email">{t('credential.login.email', 'Email address')}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              placeholder="name@example.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <div id="login-email-error" className="credential-field-error" role="alert">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="credential-field">
            <label htmlFor="login-password">{t('credential.login.password', 'Password')}</label>
            <div className="credential-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                placeholder="••••••••••••"
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="credential-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? t('credential.login.hidePassword', 'Hide password')
                    : t('credential.login.showPassword', 'Show password')
                }
              >
                {showPassword ? t('credential.hide', 'Hide') : t('credential.show', 'Show')}
              </button>
            </div>
            {fieldErrors.password && (
              <div id="login-password-error" className="credential-field-error" role="alert">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div className="credential-forgot-link-wrapper">
            <Link to="/forgot-password">
              {t('credential.login.forgotPassword', 'Forgot your password?')}
            </Link>
          </div>

          <button
            type="submit"
            className="credential-submit btn btn-primary"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? t('credential.login.submitting', 'Signing in…')
              : t('credential.login.submit', 'Sign in')}
          </button>
        </form>

        {googleControl && (
          <>
            <div className="credential-divider">
              <span>{t('credential.or', 'or')}</span>
            </div>
            <div className="credential-google-section">{googleControl}</div>
          </>
        )}

        <div className="credential-links">
          <p>
            {t('credential.login.noAccount', "Don't have an account?")}{' '}
            <Link to="/register">{t('credential.login.createAccount', 'Create account')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
