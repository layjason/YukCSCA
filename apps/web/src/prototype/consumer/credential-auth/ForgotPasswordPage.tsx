import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage(): React.JSX.Element {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError(t('credential.forgot.errorEmailRequired'));
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setEmailError(t('credential.forgot.errorEmailFormat'));
      return;
    }

    setEmailError('');
    setIsSubmitting(true);
    setEmail('');
    window.setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 150);
  }

  return (
    <div className="credential-page">
      <span className="credential-preview-badge" aria-label={t('preview.badgeAria')}>
        {t('preview.badge')}
      </span>
      <h1>{t('credential.forgot.title')}</h1>
      <p className="credential-page-subtitle">{t('credential.forgot.description')}</p>

      {submitted ? (
        <div className="credential-forgot-confirmation">
          <div className="credential-alert credential-alert-info" role="status">
            {t('credential.forgot.confirmation')}
          </div>
          <p className="credential-preview-note">{t('credential.forgot.previewNote')}</p>
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
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={emailError ? 'forgot-email-error' : 'forgot-email-hint'}
              aria-invalid={!!emailError}
              required
            />
            <p id="forgot-email-hint" className="credential-field-hint">
              {t('credential.forgot.emailHint')}
            </p>
            {emailError && (
              <p id="forgot-email-error" className="credential-field-error" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <button type="submit" className="credential-submit btn-primary" disabled={isSubmitting}>
            {t(isSubmitting ? 'credential.forgot.submitting' : 'credential.forgot.submit')}
          </button>
        </form>
      )}

      <p className="credential-alt-action">
        <Link to="/login">{t('credential.forgot.backToLogin')}</Link>
      </p>
    </div>
  );
}
