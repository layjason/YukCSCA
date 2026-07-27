import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_FIXTURE_EMAIL = 'taken@example.test';

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  duplicate?: string;
}

interface RegisterPageProps {
  googleControl?: ReactNode;
}

export function RegisterPage({ googleControl }: RegisterPageProps = {}): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dispatch } = useConsumer();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = t('credential.register.errorEmailRequired');
    } else if (!EMAIL_RE.test(email)) {
      next.email = t('credential.register.errorEmailFormat');
    }
    if (!password) {
      next.password = t('credential.register.errorPasswordRequired');
    } else if (password.length < 8) {
      next.password = t('credential.register.errorPasswordMin');
    }
    if (!confirmPassword) {
      next.confirmPassword = t('credential.register.errorConfirmRequired');
    } else if (password !== confirmPassword) {
      next.confirmPassword = t('credential.register.errorPasswordMismatch');
    }
    if (!termsAccepted) {
      next.terms = t('credential.register.errorTermsRequired');
    }
    return next;
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      // Discard password values immediately after validation failure
      setPassword('');
      setConfirmPassword('');
      return;
    }

    // Fixture: duplicate email is evaluated only after ordinary field validation.
    if (email.trim().toLowerCase() === DUPLICATE_FIXTURE_EMAIL) {
      setErrors({ duplicate: t('credential.register.errorDuplicateEmail') });
      setPassword('');
      setConfirmPassword('');
      return;
    }

    const normalizedEmail = email.trim();
    dispatch({ type: 'CREDENTIAL_REGISTER_START', email: normalizedEmail });
    setIsSubmitting(true);
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    window.setTimeout(() => {
      dispatch({ type: 'CREDENTIAL_VERIFICATION_PENDING', email: normalizedEmail });
      navigate('/verify-email');
    }, 150);
  }

  return (
    <div className="credential-page">
      <span className="credential-preview-badge" aria-label={t('preview.badgeAria')}>
        {t('preview.badge')}
      </span>
      <h1>{t('credential.register.title')}</h1>
      <p className="credential-page-subtitle">{t('credential.register.description')}</p>

      {errors.duplicate && (
        <div className="credential-alert credential-alert-error" role="alert">
          {errors.duplicate}
        </div>
      )}

      <form className="credential-form" onSubmit={handleSubmit} noValidate>
        <div className="credential-field">
          <label htmlFor="register-email">{t('credential.register.email')}</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            aria-invalid={!!errors.email}
            required
          />
          {errors.email && (
            <p id="register-email-error" className="credential-field-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="credential-field">
          <label htmlFor="register-password">{t('credential.register.password')}</label>
          <div className="credential-password-input">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={
                errors.password ? 'register-password-error' : 'register-password-requirements'
              }
              aria-invalid={!!errors.password}
              required
            />
            <button
              type="button"
              className="credential-toggle-visibility"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('credential.register.hidePassword')
                  : t('credential.register.showPassword')
              }
            >
              {showPassword ? t('credential.hide') : t('credential.show')}
            </button>
          </div>
          <ul
            id="register-password-requirements"
            className="credential-password-requirements"
            aria-label={t('credential.register.passwordRequirementsLabel')}
          >
            <li className={password.length >= 8 ? 'requirement-met' : undefined}>
              {t('credential.register.requirements')}
            </li>
          </ul>
          {errors.password && (
            <p id="register-password-error" className="credential-field-error" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div className="credential-field">
          <label htmlFor="register-confirm-password">
            {t('credential.register.confirmPassword')}
          </label>
          <div className="credential-password-input">
            <input
              id="register-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              required
            />
            <button
              type="button"
              className="credential-toggle-visibility"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={
                showConfirm
                  ? t('credential.register.hidePassword')
                  : t('credential.register.showPassword')
              }
            >
              {showConfirm ? t('credential.hide') : t('credential.show')}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="register-confirm-error" className="credential-field-error" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="credential-field credential-field-checkbox">
          <input
            id="register-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            aria-describedby={errors.terms ? 'register-terms-error' : undefined}
            aria-invalid={!!errors.terms}
          />
          <label htmlFor="register-terms">{t('credential.register.terms')}</label>
          {errors.terms && (
            <p id="register-terms-error" className="credential-field-error" role="alert">
              {errors.terms}
            </p>
          )}
        </div>

        <button type="submit" className="credential-submit btn-primary" disabled={isSubmitting}>
          {t(isSubmitting ? 'credential.register.submitting' : 'credential.register.submit')}
        </button>
      </form>

      <div className="credential-divider" role="separator" aria-label={t('credential.or')}>
        <span>{t('credential.or')}</span>
      </div>

      <div className="credential-google-section">
        {googleControl ?? (
          <>
            <p>{t('credential.register.googleHint')}</p>
            <Link to="/login" className="btn-secondary credential-google-link">
              {t('auth.continueWithGoogle')}
            </Link>
          </>
        )}
      </div>

      <p className="credential-alt-action">
        <Link to="/login">{t('credential.register.haveAccount')}</Link>
      </p>
    </div>
  );
}
