import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { completePasswordRecovery } from './authApi';
import { ApiError } from '@/shared/api/httpClient';

const MIN_PASSWORD_LENGTH = 15;
const MAX_PASSWORD_LENGTH = 128;

export function ResetPasswordForm(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const [token, setToken] = useState<string>('');
  const [tokenChecked, setTokenChecked] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    const hashToken = new URLSearchParams(location.hash.slice(1)).get('token');
    const queryToken = new URLSearchParams(location.search).get('token');
    const rawToken = (hashToken ?? queryToken)?.trim() ?? '';

    if (rawToken) {
      setToken(rawToken);
      // Immediately strip the sensitive recovery token from the visible URL history
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setTokenChecked(true);
  }, [location.hash, location.search]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    let hasError = false;
    setPasswordError('');
    setConfirmError('');
    setFormError('');

    const passwordLength = Array.from(password).length;
    if (!password) {
      setPasswordError(t('credential.reset.errorPasswordRequired'));
      hasError = true;
    } else if (passwordLength < MIN_PASSWORD_LENGTH || passwordLength > MAX_PASSWORD_LENGTH) {
      setPasswordError(t('credential.reset.errorPasswordLength'));
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmError(t('credential.reset.errorConfirmRequired'));
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmError(t('credential.reset.errorPasswordMismatch'));
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await completePasswordRecovery({ token, password });
      setPassword('');
      setConfirmPassword('');
      setToken('');
      setIsSubmitted(true);
    } catch (err) {
      setPassword('');
      setConfirmPassword('');

      if (err instanceof ApiError) {
        if (err.status === 429) {
          setFormError(t('credential.reset.rateLimited', { seconds: err.retryAfterSeconds ?? 60 }));
        } else if (err.status === 400) {
          if (err.code === 'RECOVERY_INVALID') {
            setToken('');
            setInvalidToken(true);
          } else {
            setPasswordError(t('credential.reset.errorPolicyRejected'));
          }
        } else {
          setFormError(t('credential.reset.errorUnavailable'));
        }
      } else {
        setFormError(t('credential.reset.errorUnavailable'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!tokenChecked) {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <p className="credential-page-subtitle">{t('auth.restoringSession')}</p>
        </div>
      </div>
    );
  }

  if (!isSubmitted && (invalidToken || !token)) {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.reset.invalidTokenTitle')}</h1>
          <p className="credential-page-subtitle">
            {t('credential.reset.invalidTokenDescription')}
          </p>
          <div className="credential-actions-spaced">
            <Link to="/forgot-password" className="credential-full-link btn-primary">
              {t('credential.reset.requestNewLink')}
            </Link>
          </div>
          <p className="credential-alt-action credential-links-spaced">
            <Link to="/login">{t('credential.forgot.backToLogin')}</Link>
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.reset.successTitle')}</h1>
          <div className="credential-alert credential-alert-info" role="status">
            {t('credential.reset.successDescription')}
          </div>
          <div className="credential-actions-spaced">
            <Link to="/login" className="credential-full-link btn-primary">
              {t('credential.reset.signInWithNewPassword')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="credential-page">
      <div className="credential-card">
        <h1>{t('credential.reset.title')}</h1>
        <p className="credential-page-subtitle">{t('credential.reset.description')}</p>

        {formError && (
          <div className="credential-alert credential-alert-error" role="alert">
            {formError}
          </div>
        )}

        <form className="credential-form" onSubmit={handleSubmit} noValidate>
          <div className="credential-field">
            <label htmlFor="reset-password">{t('credential.reset.password')}</label>
            <div className="credential-password-wrapper">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                aria-describedby={passwordError ? 'reset-password-error' : undefined}
                aria-invalid={!!passwordError}
                required
              />
              <button
                type="button"
                className="credential-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={t(
                  showPassword ? 'credential.reset.hidePassword' : 'credential.reset.showPassword',
                )}
              >
                {t(showPassword ? 'credential.hide' : 'credential.show')}
              </button>
            </div>
            {passwordError && (
              <p id="reset-password-error" className="credential-field-error" role="alert">
                {passwordError}
              </p>
            )}
          </div>

          <div className="credential-field">
            <label htmlFor="reset-confirm-password">{t('credential.reset.confirmPassword')}</label>
            <div className="credential-password-wrapper">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError('');
                }}
                aria-describedby={confirmError ? 'reset-confirm-error' : undefined}
                aria-invalid={!!confirmError}
                required
              />
              <button
                type="button"
                className="credential-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={t(
                  showConfirmPassword
                    ? 'credential.reset.hidePassword'
                    : 'credential.reset.showPassword',
                )}
              >
                {t(showConfirmPassword ? 'credential.hide' : 'credential.show')}
              </button>
            </div>
            {confirmError && (
              <p id="reset-confirm-error" className="credential-field-error" role="alert">
                {confirmError}
              </p>
            )}
          </div>

          <button type="submit" className="credential-submit btn-primary" disabled={isSubmitting}>
            {t(isSubmitting ? 'credential.reset.submitting' : 'credential.reset.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
