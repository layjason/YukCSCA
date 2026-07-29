import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestPasswordRecovery } from './authApi';
import { ApiError } from '@/shared/api/httpClient';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm(): React.JSX.Element {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(t('credential.forgot.errorEmailRequired'));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError(t('credential.forgot.errorEmailFormat'));
      return;
    }

    setEmailError('');
    setFormError('');
    setIsSubmitting(true);

    try {
      await requestPasswordRecovery({ email: trimmedEmail });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setFormError(t('credential.forgot.rateLimited', { seconds: 60 }));
        } else {
          setFormError(err.message || t('credential.forgot.confirmation'));
        }
      } else {
        // Safe generic outcome for non-API errors
        setSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="credential-page">
      <div className="credential-card">
        <h1>{t('credential.forgot.title')}</h1>
        <p className="credential-page-subtitle">{t('credential.forgot.description')}</p>

        {formError && (
          <div className="credential-alert credential-alert-error" role="alert">
            {formError}
          </div>
        )}

        {submitted ? (
          <div className="credential-forgot-confirmation">
            <div className="credential-alert credential-alert-info" role="status">
              {t('credential.forgot.confirmation')}
            </div>
            <p className="credential-alt-action">
              <Link to="/login">{t('credential.forgot.backToLogin')}</Link>
            </p>
          </div>
        ) : (
          <form className="credential-form" onSubmit={handleSubmit} noValidate>
            <div className="credential-field">
              <label htmlFor="forgot-email">{t('credential.forgot.email')}</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                aria-describedby={emailError ? 'forgot-email-error' : undefined}
                aria-invalid={!!emailError}
                required
              />
              {emailError && (
                <p id="forgot-email-error" className="credential-field-error" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <button type="submit" className="credential-submit btn-primary" disabled={isSubmitting}>
              {t(isSubmitting ? 'credential.forgot.submitting' : 'credential.forgot.submit')}
            </button>

            <p className="credential-alt-action">
              <Link to="/login">{t('credential.forgot.backToLogin')}</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
