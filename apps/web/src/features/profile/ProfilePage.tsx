import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile, updateMyStudentProfile } from './studentProfileApi';
import type {
  ExplanationLanguage,
  StudentGrade,
  StudentProfile,
  UpdateMyStudentProfileRequest,
} from './studentProfile.types';

type ProfileField = keyof UpdateMyStudentProfileRequest;
type FormErrors = Partial<Record<ProfileField | 'form', string>>;

const grades: StudentGrade[] = ['GRADE_10', 'GRADE_11', 'GRADE_12', 'OTHER'];
const languages: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];

export function ProfilePage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [preferredName, setPreferredName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [city, setCity] = useState('');
  const [defaultExplanationLanguage, setDefaultExplanationLanguage] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const year = useMemo(jakartaYear, []);

  async function loadProfile(): Promise<void> {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getMyStudentProfile();
      setProfile(data);
      populateForm(data);
    } catch {
      setFetchError(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  }

  function populateForm(data: StudentProfile): void {
    setPreferredName(data.preferredName);
    setBirthYear(String(data.birthYear));
    setCurrentGrade(data.currentGrade);
    setCity(data.city);
    setDefaultExplanationLanguage(data.defaultExplanationLanguage);
  }

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLanguageChange(newValue: string): void {
    setDefaultExplanationLanguage(newValue);
    if (profile && newValue !== profile.defaultExplanationLanguage) {
      setToast({
        message: `${t('profile.languageNote')} ${t('settings.historyNote')}`,
        tone: 'info',
      });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setToast(null);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setErrors({});
      setToast({ message: t('profile.noChanges'), tone: 'info' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const updated = await updateMyStudentProfile(payload);
      setProfile(updated);
      populateForm(updated);
      setToast({ message: t('profile.saveSuccess'), tone: 'success' });
    } catch (error) {
      if (error instanceof ApiError && error.violations.length > 0) {
        const fieldErrors: FormErrors = {};
        for (const v of error.violations) {
          fieldErrors[v.field as ProfileField] = fieldError(v.code);
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ form: t('profile.saveError') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function buildPayload(): UpdateMyStudentProfileRequest {
    if (!profile) return {};
    const payload: UpdateMyStudentProfileRequest = {};

    const trimmedName = preferredName.trim();
    if (trimmedName !== profile.preferredName) payload.preferredName = trimmedName;

    const numYear = Number(birthYear);
    if (numYear !== profile.birthYear) payload.birthYear = numYear;

    if (currentGrade !== profile.currentGrade) {
      payload.currentGrade = currentGrade as StudentGrade;
    }

    const trimmedCity = city.trim();
    if (trimmedCity !== profile.city) payload.city = trimmedCity;

    if (defaultExplanationLanguage !== profile.defaultExplanationLanguage) {
      payload.defaultExplanationLanguage = defaultExplanationLanguage as ExplanationLanguage;
    }

    return payload;
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const trimmedName = preferredName.trim();
    if (!trimmedName) {
      next.preferredName = t('profile.errors.required');
    } else if (trimmedName.length > 160) {
      next.preferredName = t('profile.errors.tooLong');
    }

    const numYear = Number(birthYear);
    if (!birthYear || !Number.isInteger(numYear)) {
      next.birthYear = t('profile.errors.required');
    } else if (numYear < year - 21 || numYear > year - 12) {
      next.birthYear = t('profile.errors.birthYearRange');
    }

    if (!grades.includes(currentGrade as StudentGrade)) {
      next.currentGrade = t('profile.errors.required');
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      next.city = t('profile.errors.required');
    } else if (trimmedCity.length > 120) {
      next.city = t('profile.errors.tooLong');
    }

    if (!languages.includes(defaultExplanationLanguage as ExplanationLanguage)) {
      next.defaultExplanationLanguage = t('profile.errors.required');
    }

    return next;
  }

  function fieldError(code: string): string {
    if (code === 'OUT_OF_RANGE') return t('profile.errors.birthYearRange');
    if (code === 'TOO_LONG') return t('profile.errors.tooLong');
    if (code === 'UNSUPPORTED') return t('profile.errors.unsupported');
    return t('profile.errors.required');
  }

  return (
    <div className="page-content">
      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          durationMs={2000}
          onDismiss={dismissToast}
        />
      ) : null}

      <Link to="/app/today" className="back-btn">
        <span className="back-arrow" aria-hidden="true">
          ←
        </span>
        {t('nav.backToDashboard')}
      </Link>

      <h1>{t('profile.title')}</h1>

      <section className="profile-identity" aria-labelledby="account-identity-heading">
        <h2 id="account-identity-heading">{t('profile.accountTitle')}</h2>
        <dl>
          <div>
            <dt>{t('profile.name')}</dt>
            <dd>{user?.displayName ?? t('shell.fallbackName')}</dd>
          </div>
          <div>
            <dt>{t('profile.email')}</dt>
            <dd>{user?.email ?? ''}</dd>
          </div>
          <div>
            <dt>{t('profile.role')}</dt>
            <dd>{t(`roles.${user?.role ?? 'STUDENT'}`)}</dd>
          </div>
        </dl>
      </section>

      {loading ? (
        <section className="profile-learner-section" aria-busy="true">
          <p className="task-meta">{t('shell.loading')}</p>
        </section>
      ) : fetchError ? (
        <section className="profile-learner-section">
          <p className="error-message" role="alert">
            {fetchError}
          </p>
          <button type="button" className="btn-secondary" onClick={() => void loadProfile()}>
            {t('profile.retry')}
          </button>
        </section>
      ) : (
        <section className="profile-learner-section" aria-labelledby="learner-profile-heading">
          <h2 id="learner-profile-heading">{t('profile.learnerTitle')}</h2>

          <form onSubmit={(event) => void submit(event)} noValidate>
            <ProfileInput
              id="preferredName"
              label={t('profile.preferredName')}
              value={preferredName}
              onChange={setPreferredName}
              error={errors.preferredName}
              maxLength={160}
            />

            <ProfileInput
              id="birthYear"
              label={t('profile.birthYear')}
              value={birthYear}
              onChange={setBirthYear}
              error={errors.birthYear}
              inputMode="numeric"
            />

            <div className="form-group">
              <label htmlFor="currentGrade">{t('profile.currentGrade')}</label>
              <select
                id="currentGrade"
                value={currentGrade}
                onChange={(event) => setCurrentGrade(event.target.value)}
                aria-describedby={errors.currentGrade ? 'currentGrade-error' : undefined}
                aria-invalid={Boolean(errors.currentGrade)}
              >
                <option value="">{t('profile.selectPlaceholder')}</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {t(`studentActivation.grades.${grade}`)}
                  </option>
                ))}
              </select>
              <FieldError id="currentGrade-error" error={errors.currentGrade} />
            </div>

            <ProfileInput
              id="city"
              label={t('profile.city')}
              value={city}
              onChange={setCity}
              error={errors.city}
              maxLength={120}
            />

            <div className="form-group">
              <label htmlFor="defaultExplanationLanguage">
                {t('profile.defaultExplanationLanguage')}
              </label>
              <select
                id="defaultExplanationLanguage"
                value={defaultExplanationLanguage}
                onChange={(event) => handleLanguageChange(event.target.value)}
                aria-describedby={
                  errors.defaultExplanationLanguage ? 'defaultExplanationLanguage-error' : undefined
                }
                aria-invalid={Boolean(errors.defaultExplanationLanguage)}
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {t(`studentActivation.languages.${language}`)}
                  </option>
                ))}
              </select>
              <FieldError
                id="defaultExplanationLanguage-error"
                error={errors.defaultExplanationLanguage}
              />
            </div>

            {errors.form ? (
              <p className="error-message" role="alert">
                {errors.form}
              </p>
            ) : null}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </section>
      )}

      <nav className="profile-links" aria-label={t('profile.settingsLabel')}>
        <ul role="list">
          <li>
            <Link to="/app/profile/languages">
              <span>{t('nav.languages')}</span>
              <span className="nav-chevron-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
          <li>
            <Link to="/app/profile/family">
              <span>{t('nav.family')}</span>
              <span className="nav-chevron-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
          <li>
            <Link to="/app/profile/access">
              <span>{t('nav.access')}</span>
              <span className="nav-chevron-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      <button type="button" className="btn-secondary profile-logout" onClick={() => void logout()}>
        {t('shell.logout')}
      </button>
    </div>
  );
}

interface ProfileInputProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  error: string | undefined;
  maxLength?: number;
  inputMode?: 'numeric';
  helpText?: string;
}

function ProfileInput({
  id,
  label,
  value,
  onChange,
  error,
  maxLength,
  inputMode,
  helpText,
}: ProfileInputProps): React.JSX.Element {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {helpText ? <p className="field-help-text">{helpText}</p> : null}
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        aria-invalid={Boolean(error)}
        maxLength={maxLength}
        inputMode={inputMode}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function FieldError({
  id,
  error,
}: {
  id: string;
  error: string | undefined;
}): React.JSX.Element | null {
  return error ? (
    <p id={id} className="field-error" role="alert">
      {error}
    </p>
  ) : null;
}

function jakartaYear(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date()),
  );
}
