import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { PreviewBadge } from '@/shared/components/PreviewBadge';
import type { ParentProfile, ParentOnboardingStep } from '../models/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS: ParentOnboardingStep[] = ['profile', 'privacy', 'complete'];

interface ProfileFormState {
  name: string;
  relationship: string;
  contactEmail: string;
  preferredContact: 'email';
  locale: string;
}

interface PrivacyFormState {
  essentialNotifications: boolean;
  learningReminders: boolean;
  weeklyReport: boolean;
  riskAlerts: boolean;
  marketingOptIn: boolean;
  termsAccepted: boolean;
}

interface FieldErrors {
  name?: string;
  contactEmail?: string;
  termsAccepted?: string;
}

export function ParentOnboardingPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const currentStep = state.parentOnboardingStep ?? 'profile';
  const currentStepIndex = STEPS.indexOf(currentStep);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    relationship: 'parent',
    contactEmail: '',
    preferredContact: 'email',
    locale: 'id',
  });

  const [privacyForm, setPrivacyForm] = useState<PrivacyFormState>({
    essentialNotifications: true,
    learningReminders: true,
    weeklyReport: true,
    riskAlerts: true,
    marketingOptIn: false,
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  function validateProfile(): FieldErrors {
    const next: FieldErrors = {};
    if (!profileForm.name.trim()) {
      next.name = t('parent.onboarding.profile.errorNameRequired');
    }
    if (!profileForm.contactEmail.trim()) {
      next.contactEmail = t('parent.onboarding.profile.errorEmailRequired');
    } else if (!EMAIL_RE.test(profileForm.contactEmail)) {
      next.contactEmail = t('parent.onboarding.profile.errorEmailFormat');
    }
    return next;
  }

  function handleProfileSubmit(e: FormEvent): void {
    e.preventDefault();
    const next = validateProfile();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    dispatch({ type: 'PARENT_ONBOARDING_STEP', step: 'privacy' });
  }

  function handlePrivacySubmit(e: FormEvent): void {
    e.preventDefault();
    if (!privacyForm.termsAccepted) {
      setErrors({ termsAccepted: t('parent.onboarding.privacy.errorTermsRequired') });
      return;
    }
    setErrors({});
    dispatch({ type: 'PARENT_ONBOARDING_STEP', step: 'complete' });
  }

  function handleComplete(): void {
    const profile: ParentProfile = {
      name: profileForm.name.trim(),
      relationship: profileForm.relationship,
      contactEmail: profileForm.contactEmail.trim(),
      preferredContact: profileForm.preferredContact,
      locale: profileForm.locale,
      essentialNotifications: privacyForm.essentialNotifications,
      learningReminders: privacyForm.learningReminders,
      weeklyReport: privacyForm.weeklyReport,
      riskAlerts: privacyForm.riskAlerts,
      marketingOptIn: privacyForm.marketingOptIn,
      termsAccepted: privacyForm.termsAccepted,
    };
    dispatch({ type: 'PARENT_PROFILE_COMPLETE', profile });
    navigate('/parent/home');
  }

  return (
    <div className="parent-onboarding">
      <header className="parent-onboarding-header">
        <PreviewBadge />
        <h1>{t('parent.onboarding.title')}</h1>
      </header>

      <nav className="parent-onboarding-steps" aria-label={t('parent.onboarding.progressLabel')}>
        <ol>
          {STEPS.map((step, i) => (
            <li
              key={step}
              aria-current={i === currentStepIndex ? 'step' : undefined}
              className={
                i < currentStepIndex
                  ? 'step-complete'
                  : i === currentStepIndex
                    ? 'step-current'
                    : 'step-upcoming'
              }
            >
              {t(`parent.onboarding.steps.${step}`)}
            </li>
          ))}
        </ol>
      </nav>

      <main className="parent-onboarding-main">
        {currentStep === 'profile' && (
          <form className="parent-onboarding-form" onSubmit={handleProfileSubmit} noValidate>
            <h2>{t('parent.onboarding.profile.heading')}</h2>

            <div className="parent-field">
              <label htmlFor="parent-name">{t('parent.onboarding.profile.name')}</label>
              <input
                id="parent-name"
                type="text"
                autoComplete="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                aria-describedby={errors.name ? 'parent-name-error' : undefined}
                aria-invalid={!!errors.name}
                required
              />
              {errors.name && (
                <p id="parent-name-error" className="parent-field-error" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="parent-field">
              <label htmlFor="parent-relationship">
                {t('parent.onboarding.profile.relationship')}
              </label>
              <select
                id="parent-relationship"
                value={profileForm.relationship}
                onChange={(e) => setProfileForm((f) => ({ ...f, relationship: e.target.value }))}
              >
                <option value="parent">{t('parent.onboarding.profile.relationshipParent')}</option>
                <option value="guardian">
                  {t('parent.onboarding.profile.relationshipGuardian')}
                </option>
                <option value="other">{t('parent.onboarding.profile.relationshipOther')}</option>
              </select>
            </div>

            <div className="parent-field">
              <label htmlFor="parent-email">{t('parent.onboarding.profile.contactEmail')}</label>
              <input
                id="parent-email"
                type="email"
                autoComplete="email"
                value={profileForm.contactEmail}
                onChange={(e) => setProfileForm((f) => ({ ...f, contactEmail: e.target.value }))}
                aria-describedby={errors.contactEmail ? 'parent-email-error' : undefined}
                aria-invalid={!!errors.contactEmail}
                required
              />
              {errors.contactEmail && (
                <p id="parent-email-error" className="parent-field-error" role="alert">
                  {errors.contactEmail}
                </p>
              )}
            </div>

            <fieldset className="parent-field">
              <legend>{t('parent.onboarding.profile.preferredContact')}</legend>
              <div className="parent-radio-group">
                <label htmlFor="parent-contact-email">
                  <input
                    id="parent-contact-email"
                    type="radio"
                    name="preferredContact"
                    value="email"
                    checked={profileForm.preferredContact === 'email'}
                    onChange={() => setProfileForm((f) => ({ ...f, preferredContact: 'email' }))}
                  />
                  {t('parent.onboarding.profile.preferredEmail')}
                </label>
              </div>
            </fieldset>

            <div className="parent-field">
              <label htmlFor="parent-locale">{t('parent.onboarding.profile.locale')}</label>
              <select
                id="parent-locale"
                value={profileForm.locale}
                onChange={(e) => setProfileForm((f) => ({ ...f, locale: e.target.value }))}
              >
                <option value="id">{t('parent.onboarding.profile.localeId')}</option>
                <option value="en">{t('parent.onboarding.profile.localeEn')}</option>
                <option value="zh-CN">{t('parent.onboarding.profile.localeZh')}</option>
              </select>
            </div>

            <button type="submit" className="btn-primary parent-onboarding-next">
              {t('parent.onboarding.continueToPrivacy')}
            </button>
          </form>
        )}

        {currentStep === 'privacy' && (
          <form className="parent-onboarding-form" onSubmit={handlePrivacySubmit} noValidate>
            <h2>{t('parent.onboarding.privacy.heading')}</h2>

            <section
              className="parent-privacy-explanation"
              aria-labelledby="privacy-explanation-heading"
            >
              <h3 id="privacy-explanation-heading">
                {t('parent.onboarding.privacy.explanationTitle')}
              </h3>
              <p>{t('parent.onboarding.privacy.explanation')}</p>
              <h4>{t('parent.onboarding.privacy.canSeeTitle')}</h4>
              <ul>
                <li>{t('parent.onboarding.privacy.canSeeProgress')}</li>
                <li>{t('parent.onboarding.privacy.canSeeRisk')}</li>
                <li>{t('parent.onboarding.privacy.canSeeAccess')}</li>
              </ul>
              <h4>{t('parent.onboarding.privacy.cannotSeeTitle')}</h4>
              <ul>
                <li>{t('parent.onboarding.privacy.cannotSeeConversations')}</li>
                <li>{t('parent.onboarding.privacy.cannotSeeNotes')}</li>
              </ul>
            </section>

            <fieldset className="parent-field">
              <legend>{t('parent.onboarding.privacy.notificationsLegend')}</legend>

              <div className="parent-checkbox-group">
                <div className="parent-checkbox-item">
                  <label htmlFor="parent-notif-essential">
                    <input
                      id="parent-notif-essential"
                      type="checkbox"
                      checked={privacyForm.essentialNotifications}
                      disabled
                    />
                    {t('parent.onboarding.privacy.essentialTitle')}
                  </label>
                  <span className="parent-checkbox-tag">
                    {t('parent.onboarding.privacy.alwaysOn')}
                  </span>
                </div>

                <label htmlFor="parent-notif-reminders">
                  <input
                    id="parent-notif-reminders"
                    type="checkbox"
                    checked={privacyForm.learningReminders}
                    onChange={(e) =>
                      setPrivacyForm((f) => ({ ...f, learningReminders: e.target.checked }))
                    }
                  />
                  {t('parent.onboarding.privacy.learningReminders')}
                </label>

                <label htmlFor="parent-notif-weekly">
                  <input
                    id="parent-notif-weekly"
                    type="checkbox"
                    checked={privacyForm.weeklyReport}
                    onChange={(e) =>
                      setPrivacyForm((f) => ({ ...f, weeklyReport: e.target.checked }))
                    }
                  />
                  {t('parent.onboarding.privacy.weeklyReport')}
                </label>

                <label htmlFor="parent-notif-risk">
                  <input
                    id="parent-notif-risk"
                    type="checkbox"
                    checked={privacyForm.riskAlerts}
                    onChange={(e) =>
                      setPrivacyForm((f) => ({ ...f, riskAlerts: e.target.checked }))
                    }
                  />
                  {t('parent.onboarding.privacy.riskAlerts')}
                </label>
              </div>
            </fieldset>

            <div className="parent-field parent-field-checkbox">
              <input
                id="parent-marketing"
                type="checkbox"
                checked={privacyForm.marketingOptIn}
                onChange={(e) =>
                  setPrivacyForm((f) => ({ ...f, marketingOptIn: e.target.checked }))
                }
              />
              <label htmlFor="parent-marketing">
                {t('parent.onboarding.privacy.marketingOptIn')}
              </label>
            </div>

            <div className="parent-field parent-field-checkbox">
              <input
                id="parent-terms"
                type="checkbox"
                checked={privacyForm.termsAccepted}
                onChange={(e) => setPrivacyForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
                aria-describedby={errors.termsAccepted ? 'parent-terms-error' : undefined}
                aria-invalid={!!errors.termsAccepted}
              />
              <label htmlFor="parent-terms">{t('parent.onboarding.privacy.termsAccept')}</label>
              {errors.termsAccepted && (
                <p id="parent-terms-error" className="parent-field-error" role="alert">
                  {errors.termsAccepted}
                </p>
              )}
            </div>

            <div className="parent-onboarding-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dispatch({ type: 'PARENT_ONBOARDING_STEP', step: 'profile' })}
              >
                {t('parent.onboarding.back')}
              </button>
              <button type="submit" className="btn-primary">
                {t('parent.onboarding.continueToComplete')}
              </button>
            </div>
          </form>
        )}

        {currentStep === 'complete' && (
          <section className="parent-onboarding-complete" aria-labelledby="parent-complete-heading">
            <h2 id="parent-complete-heading">{t('parent.onboarding.complete.heading')}</h2>
            <p>{t('parent.onboarding.complete.summary')}</p>

            <dl className="parent-summary-list">
              <dt>{t('parent.onboarding.profile.name')}</dt>
              <dd>{profileForm.name}</dd>

              <dt>{t('parent.onboarding.profile.relationship')}</dt>
              <dd>
                {t(
                  `parent.onboarding.profile.relationship${
                    profileForm.relationship === 'parent'
                      ? 'Parent'
                      : profileForm.relationship === 'guardian'
                        ? 'Guardian'
                        : 'Other'
                  }`,
                )}
              </dd>

              <dt>{t('parent.onboarding.profile.contactEmail')}</dt>
              <dd>{profileForm.contactEmail}</dd>

              <dt>{t('parent.onboarding.profile.preferredContact')}</dt>
              <dd>{t('parent.onboarding.profile.preferredEmail')}</dd>

              <dt>{t('parent.onboarding.privacy.marketingOptIn')}</dt>
              <dd>
                {privacyForm.marketingOptIn
                  ? t('parent.onboarding.complete.optedIn')
                  : t('parent.onboarding.complete.optedOut')}
              </dd>
            </dl>

            <p className="parent-onboarding-note">{t('parent.onboarding.complete.noLinkedNote')}</p>

            <button type="button" className="btn-primary" onClick={handleComplete}>
              {t('parent.onboarding.complete.enterWorkspace')}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
