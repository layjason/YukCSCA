import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { refreshSession } from '@/features/auth/authApi';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/shared/api/httpClient';
import { activateStudentProfile } from './studentProfileApi';
import type {
  ActivateStudentProfileRequest,
  ExplanationLanguage,
  StudentGrade,
} from './studentProfile.types';

type ProfileField = keyof ActivateStudentProfileRequest;
type FormErrors = Partial<Record<ProfileField | 'form', string>>;

const grades: StudentGrade[] = ['GRADE_10', 'GRADE_11', 'GRADE_12', 'OTHER'];
const languages: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];

export default function StudentActivationPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, replaceCurrentUser } = useAuth();
  const [preferredName, setPreferredName] = useState(user?.displayName ?? '');
  const [birthYear, setBirthYear] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [city, setCity] = useState('');
  const [defaultExplanationLanguage, setDefaultExplanationLanguage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const year = useMemo(jakartaYear, []);

  if (user?.role !== 'UNASSIGNED') return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const request = buildRequest();
    const clientErrors = validate(request);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const result = await activateStudentProfile(request);
      replaceCurrentUser(result.authentication.user);
      navigate('/onboarding/student/goals', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const currentUser = await refreshSession().catch(() => null);
        if (currentUser) {
          replaceCurrentUser(currentUser);
          navigate('/onboarding/student/goals', { replace: true });
          return;
        }
      }
      if (error instanceof ApiError && error.violations.length > 0) {
        setErrors(
          Object.fromEntries(
            error.violations.map((violation) => [violation.field, fieldError(violation.code)]),
          ) as FormErrors,
        );
      } else {
        setErrors({ form: t('studentActivation.errors.requestFailed') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function buildRequest(): ActivateStudentProfileRequest {
    return {
      preferredName: preferredName.trim(),
      birthYear: Number(birthYear),
      currentGrade: currentGrade as StudentGrade,
      city: city.trim(),
      defaultExplanationLanguage: defaultExplanationLanguage as ExplanationLanguage,
    };
  }

  function validate(request: ActivateStudentProfileRequest): FormErrors {
    const next: FormErrors = {};
    if (!request.preferredName) next.preferredName = t('studentActivation.errors.required');
    else if (request.preferredName.length > 160)
      next.preferredName = t('studentActivation.errors.tooLong');
    if (!Number.isInteger(request.birthYear))
      next.birthYear = t('studentActivation.errors.required');
    else if (request.birthYear < year - 21 || request.birthYear > year - 12)
      next.birthYear = t('studentActivation.errors.birthYearRange');
    if (!grades.includes(request.currentGrade))
      next.currentGrade = t('studentActivation.errors.required');
    if (!request.city) next.city = t('studentActivation.errors.required');
    else if (request.city.length > 120) next.city = t('studentActivation.errors.tooLong');
    if (!languages.includes(request.defaultExplanationLanguage))
      next.defaultExplanationLanguage = t('studentActivation.errors.required');
    return next;
  }

  function fieldError(code: string): string {
    if (code === 'OUT_OF_RANGE') return t('studentActivation.errors.birthYearRange');
    if (code === 'TOO_LONG') return t('studentActivation.errors.tooLong');
    if (code === 'UNSUPPORTED') return t('studentActivation.errors.unsupported');
    return t('studentActivation.errors.required');
  }

  return (
    <main className="page-shell onboarding-shell">
      <section className="onboarding-card" aria-labelledby="student-activation-title">
        <p className="eyebrow">{t('studentActivation.eyebrow')}</p>
        <h1 id="student-activation-title">{t('studentActivation.title')}</h1>
        <p>{t('studentActivation.description')}</p>

        <form onSubmit={(event) => void submit(event)} noValidate>
          <ProfileFieldInput
            id="preferredName"
            label={t('studentActivation.preferredName')}
            value={preferredName}
            onChange={setPreferredName}
            error={errors.preferredName}
            maxLength={160}
          />
          <ProfileFieldInput
            id="birthYear"
            label={t('studentActivation.birthYear')}
            value={birthYear}
            onChange={setBirthYear}
            error={errors.birthYear}
            inputMode="numeric"
          />

          <label htmlFor="currentGrade">{t('studentActivation.currentGrade')}</label>
          <select
            id="currentGrade"
            value={currentGrade}
            onChange={(event) => setCurrentGrade(event.target.value)}
            aria-describedby={errors.currentGrade ? 'currentGrade-error' : undefined}
            aria-invalid={Boolean(errors.currentGrade)}
          >
            <option value="">{t('studentActivation.selectPlaceholder')}</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {t(`studentActivation.grades.${grade}`)}
              </option>
            ))}
          </select>
          <FieldError id="currentGrade-error" error={errors.currentGrade} />

          <ProfileFieldInput
            id="city"
            label={t('studentActivation.city')}
            value={city}
            onChange={setCity}
            error={errors.city}
            maxLength={120}
          />

          <label htmlFor="defaultExplanationLanguage">
            {t('studentActivation.defaultExplanationLanguage')}
          </label>
          <select
            id="defaultExplanationLanguage"
            value={defaultExplanationLanguage}
            onChange={(event) => setDefaultExplanationLanguage(event.target.value)}
            aria-describedby={
              errors.defaultExplanationLanguage ? 'defaultExplanationLanguage-error' : undefined
            }
            aria-invalid={Boolean(errors.defaultExplanationLanguage)}
          >
            <option value="">{t('studentActivation.selectPlaceholder')}</option>
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

          <p className="privacy-note">{t('studentActivation.privacyNotice')}</p>
          {errors.form ? (
            <p className="error-message" role="alert">
              {errors.form}
            </p>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? t('studentActivation.submitting') : t('studentActivation.submit')}
          </button>
        </form>
      </section>
    </main>
  );
}

interface ProfileFieldInputProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  error: string | undefined;
  maxLength?: number;
  inputMode?: 'numeric';
}

function ProfileFieldInput({
  id,
  label,
  value,
  onChange,
  error,
  maxLength,
  inputMode,
}: ProfileFieldInputProps): React.JSX.Element {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        maxLength={maxLength}
        inputMode={inputMode}
      />
      <FieldError id={`${id}-error`} error={error} />
    </>
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
    <p id={id} className="field-error">
      {error}
    </p>
  ) : null;
}

function jakartaYear(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date()),
  );
}
