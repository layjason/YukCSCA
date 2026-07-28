import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { completeCredentialVerification } from './authApi';
import type { CredentialVerificationOutcome } from './auth.types';
import { ApiError } from '@/shared/api/httpClient';

const TERMS_VERSION = 'TERMS_V1';
const PRIVACY_NOTICE_VERSION = 'PRIVACY_V1';
const MIN_PASSWORD_LENGTH = 15;
const MAX_PASSWORD_LENGTH = 128;

export function AccountVerificationForm(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const [rawToken, setRawToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyNoticeAcknowledged, setPrivacyNoticeAcknowledged] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<CredentialVerificationOutcome | null>(null);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  useEffect(() => {
    // Extract token from fragment (#token=...) or query (?token=...)
    let extractedToken: string | null = null;
    let extractedEmail: string | null = null;

    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.slice(1));
      extractedToken = hashParams.get('token');
      extractedEmail = hashParams.get('email');
    }

    if (!extractedToken && location.search) {
      const searchParams = new URLSearchParams(location.search);
      extractedToken = searchParams.get('token');
      extractedEmail = searchParams.get('email');
    }

    if (extractedEmail) {
      setEmailHint(extractedEmail);
    }

    if (extractedToken) {
      setRawToken(extractedToken);
      // Clean up address bar immediately so raw verification token is not retained in history or logs
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location.hash, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    if (!rawToken) {
      setIsTokenInvalid(true);
      return;
    }

    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = t('credential.verify.errorPasswordRequired', 'Password is required.');
    } else if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      errors.password = t(
        'credential.verify.errorPasswordMin',
        'Password must be 15 to 128 characters.',
      );
    }

    if (!confirmPassword) {
      errors.confirmPassword = t(
        'credential.verify.errorConfirmRequired',
        'Please confirm your password.',
      );
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t(
        'credential.register.errorPasswordMismatch',
        'Passwords do not match.',
      );
    }

    if (!termsAccepted) {
      errors.terms = t(
        'credential.verify.errorTermsRequired',
        'You must accept the Terms of Service to continue.',
      );
    }

    if (!privacyNoticeAcknowledged) {
      errors.privacy = t(
        'credential.verify.errorPrivacyRequired',
        'You must acknowledge the Privacy Notice to continue.',
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeCredentialVerification({
        token: rawToken,
        password,
        termsVersion: TERMS_VERSION,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        termsAccepted: true,
        privacyNoticeAcknowledged: true,
      });

      // Clear password fields from memory immediately after invocation
      setPassword('');
      setConfirmPassword('');

      setOutcome(result.outcome);
    } catch (err) {
      setPassword('');
      setConfirmPassword('');

      if (err instanceof ApiError) {
        if (err.status === 400) {
          setIsTokenInvalid(true);
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
            t(
              'credential.verify.serverError',
              'Verification could not be completed. Please try again.',
            ),
          );
        }
      } else {
        setServerError(
          t(
            'credential.verify.serverError',
            'Verification could not be completed. Please try again.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Outcome 1: Verification completed successfully (CREDENTIAL_ACCOUNT_CREATED)
  if (outcome === 'CREDENTIAL_ACCOUNT_CREATED') {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.verify.accountCreatedTitle', 'Email verified!')}</h1>
          <div className="credential-alert credential-alert-info" aria-live="polite">
            <p>
              {t(
                'credential.verify.accountCreatedMessage',
                'Your account has been created successfully. Please sign in to continue.',
              )}
            </p>
          </div>

          <div className="credential-links credential-actions-spaced">
            <Link
              to={emailHint ? `/login?email=${encodeURIComponent(emailHint)}` : '/login'}
              className="btn btn-primary credential-full-link"
            >
              {t('credential.register.signIn', 'Sign in')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Outcome 2: Verification claim collided with Google account (SIGN_IN_WITH_GOOGLE)
  if (outcome === 'SIGN_IN_WITH_GOOGLE') {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.verify.googleCollisionTitle', 'Registered with Google')}</h1>
          <div className="credential-alert credential-alert-info" aria-live="polite">
            <p>
              {t(
                'credential.verify.googleCollisionMessage',
                'This email address is registered with Google Sign-In. Please sign in using your Google account.',
              )}
            </p>
          </div>

          <div className="credential-links credential-actions-spaced">
            <Link to="/login" className="btn btn-primary credential-full-link">
              {t('auth.continueWithGoogle', 'Continue with Google')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid, expired, or missing token
  if (isTokenInvalid || (!rawToken && !isSubmitting)) {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.verify.invalidTokenTitle', 'Verification link expired')}</h1>
          <div className="credential-alert credential-alert-error" role="alert">
            <p>
              {t(
                'credential.verify.invalidToken',
                'This verification link is invalid or has expired.',
              )}
            </p>
          </div>

          <div className="credential-links credential-actions-spaced">
            <Link to="/register" className="btn btn-primary credential-full-link">
              {t('credential.verify.restartRegistration', 'Request a new verification link')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="credential-page">
      <div className="credential-card">
        <h1>{t('credential.verify.title', 'Set up password & terms')}</h1>
        <p className="credential-description">
          {emailHint
            ? t('credential.verify.description', 'Complete registration for {{email}}', {
                email: emailHint,
              })
            : t('credential.verify.genericDescription', 'Complete your account setup below.')}
        </p>

        {serverError && (
          <div className="credential-alert credential-alert-error" role="alert">
            <p>{serverError}</p>
          </div>
        )}

        <form className="credential-form" onSubmit={handleSubmit} noValidate>
          <div className="credential-field">
            <label htmlFor="verify-password">{t('credential.register.password', 'Password')}</label>
            <div className="credential-password-wrapper">
              <input
                id="verify-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                placeholder="•••••••••••••••"
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? 'verify-password-error' : 'verify-password-requirements'
                }
                autoComplete="new-password"
              />
              <button
                type="button"
                className="credential-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? t('credential.register.hidePassword', 'Hide password')
                    : t('credential.register.showPassword', 'Show password')
                }
              >
                {showPassword ? t('credential.hide', 'Hide') : t('credential.show', 'Show')}
              </button>
            </div>
            <p id="verify-password-requirements" className="credential-password-requirements">
              {t('credential.verify.passwordMin15', 'Password must be 15 to 128 characters.')}
            </p>
            {fieldErrors.password && (
              <div id="verify-password-error" className="credential-field-error" role="alert">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div className="credential-field">
            <label htmlFor="verify-confirm-password">
              {t('credential.register.confirmPassword', 'Confirm password')}
            </label>
            <div className="credential-password-wrapper">
              <input
                id="verify-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="•••••••••••••••"
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'verify-confirm-error' : undefined}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="credential-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword
                    ? t('credential.register.hidePassword', 'Hide password')
                    : t('credential.register.showPassword', 'Show password')
                }
              >
                {showConfirmPassword ? t('credential.hide', 'Hide') : t('credential.show', 'Show')}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <div id="verify-confirm-error" className="credential-field-error" role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          <div className="credential-field-checkbox">
            <label className="credential-checkbox-label">
              <input
                id="verify-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (fieldErrors.terms) {
                    setFieldErrors((prev) => ({ ...prev, terms: '' }));
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.terms)}
              />
              <span>
                {t('credential.verify.termsCheckbox', 'I accept the Terms of Service (v1.0)')}
              </span>
            </label>
            {fieldErrors.terms && (
              <div className="credential-field-error" role="alert">
                {fieldErrors.terms}
              </div>
            )}
          </div>

          <div className="credential-field-checkbox">
            <label className="credential-checkbox-label">
              <input
                id="verify-privacy"
                type="checkbox"
                checked={privacyNoticeAcknowledged}
                onChange={(e) => {
                  setPrivacyNoticeAcknowledged(e.target.checked);
                  if (fieldErrors.privacy) {
                    setFieldErrors((prev) => ({ ...prev, privacy: '' }));
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.privacy)}
              />
              <span>
                {t('credential.verify.privacyCheckbox', 'I acknowledge the Privacy Notice (v1.0)')}
              </span>
            </label>
            {fieldErrors.privacy && (
              <div className="credential-field-error" role="alert">
                {fieldErrors.privacy}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="credential-submit btn btn-primary"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? t('credential.verify.completingSubmit', 'Completing registration…')
              : t('credential.verify.completeSubmit', 'Complete registration')}
          </button>
        </form>
      </div>
    </div>
  );
}
