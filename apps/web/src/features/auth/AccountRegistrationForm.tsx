import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { resendCredentialVerification, startCredentialRegistration } from './authApi';
import { ApiError } from '@/shared/api/httpClient';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

interface AccountRegistrationFormProps {
  googleControl?: ReactNode;
}

export function AccountRegistrationForm({
  googleControl,
}: AccountRegistrationFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedEmail, setAcceptedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const startCooldownTimer = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);
    setResendNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldError(t('credential.register.errorEmailRequired', 'Email address is required.'));
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setFieldError(t('credential.register.errorEmailFormat', 'Enter a valid email address.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await startCredentialRegistration({ email: trimmedEmail });
      setAcceptedEmail(trimmedEmail);
      setIsAccepted(true);
      startCooldownTimer();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setFieldError(t('credential.register.errorEmailFormat', 'Enter a valid email address.'));
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
              'credential.register.serverError',
              'Registration request could not be processed. Please try again.',
            ),
          );
        }
      } else {
        setServerError(
          t(
            'credential.register.serverError',
            'Registration request could not be processed. Please try again.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setServerError(null);
    setResendNotice(null);
    try {
      await resendCredentialVerification({ email: acceptedEmail });
      setResendNotice(t('credential.verify.resent', 'Verification link resent.'));
      startCooldownTimer();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setServerError(
          t(
            'credential.login.rateLimitError',
            'Too many requests. Please try again in {{seconds}} seconds.',
            { seconds: 60 },
          ),
        );
      } else {
        setServerError(
          t('credential.verify.resendFailed', 'Could not resend verification link. Try again.'),
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isAccepted) {
    return (
      <div className="credential-page">
        <div className="credential-card">
          <h1>{t('credential.register.checkEmailTitle', 'Check your email inbox')}</h1>
          <div className="credential-alert credential-alert-info" aria-live="polite">
            <p>
              {t(
                'credential.register.checkEmailAck',
                'If {{email}} is eligible, we sent a verification link. Links expire after 30 minutes. Check your spam or junk folder if you do not see it.',
                { email: acceptedEmail },
              )}
            </p>
          </div>

          {resendNotice && (
            <div className="credential-alert credential-alert-info" aria-live="polite">
              <p>{resendNotice}</p>
            </div>
          )}

          {serverError && (
            <div className="credential-alert credential-alert-error" role="alert">
              <p>{serverError}</p>
            </div>
          )}

          <div className="credential-links credential-actions-spaced">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              aria-busy={isResending}
            >
              {cooldown > 0
                ? t('credential.verify.resendCooldown', 'Resend available in {{seconds}}s', {
                    seconds: cooldown,
                  })
                : isResending
                  ? t('credential.verify.verifying', 'Sending…')
                  : t('credential.register.resendLink', 'Resend verification link')}
            </button>
          </div>

          <div className="credential-links credential-links-spaced">
            <p>
              {t('credential.register.haveAccount', 'Already have an account?')}{' '}
              <Link to="/login">{t('credential.register.signIn', 'Sign in')}</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="credential-page">
      <div className="credential-card">
        <h1>{t('credential.register.title', 'Create your account')}</h1>
        <p className="credential-description">
          {t(
            'credential.register.description',
            'Register with email to start your YukCSCA journey.',
          )}
        </p>

        {serverError && (
          <div className="credential-alert credential-alert-error" role="alert">
            <p>{serverError}</p>
          </div>
        )}

        <form className="credential-form" onSubmit={handleSubmit} noValidate>
          <div className="credential-field">
            <label htmlFor="reg-email">{t('credential.register.email', 'Email address')}</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="name@example.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'reg-email-error' : undefined}
              autoComplete="email"
            />
            {fieldError && (
              <div id="reg-email-error" className="credential-field-error" role="alert">
                {fieldError}
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
              ? t('credential.register.submitting', 'Sending verification link…')
              : t('credential.register.submit', 'Send verification link')}
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
            {t('credential.register.haveAccount', 'Already have an account?')}{' '}
            <Link to="/login">{t('credential.register.signIn', 'Sign in')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
