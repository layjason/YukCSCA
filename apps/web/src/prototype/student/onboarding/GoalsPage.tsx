import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import type { GoalsData } from '@/prototype/student/types';

interface FormErrors {
  enrollmentYear?: string;
  examDate?: string;
  targetMajor?: string;
  weeklyHours?: string;
  preferredDays?: string;
}

export function GoalsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = usePrototype();

  const [enrollmentYear, setEnrollmentYear] = useState('2027');
  const [examDate, setExamDate] = useState('');
  const [targetUniversity, setTargetUniversity] = useState('');
  const [isUndecided, setIsUndecided] = useState(false);
  const [targetMajor, setTargetMajor] = useState('');
  const [programType, setProgramType] = useState('undergraduate');
  const [languageOfInstruction, setLanguageOfInstruction] = useState('en');
  const [weeklyHours, setWeeklyHours] = useState('6');
  const [preferredDays, setPreferredDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const goals: GoalsData = {
      enrollmentYear,
      examDate,
      targetUniversity: isUndecided ? null : targetUniversity || null,
      targetMajor,
      programType,
      languageOfInstruction,
      weeklyHours: Number(weeklyHours),
      preferredDays,
      isUndecided,
    };

    setTimeout(() => {
      dispatch({ type: 'COMPLETE_GOALS', goals });
      navigate('/onboarding/student/subjects');
    }, 300);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!enrollmentYear.trim()) errs.enrollmentYear = t('onboarding.goalsErrors.required');
    if (!examDate.trim()) errs.examDate = t('onboarding.goalsErrors.required');
    if (!targetMajor.trim()) errs.targetMajor = t('onboarding.goalsErrors.required');
    const hours = Number(weeklyHours);
    if (Number.isNaN(hours) || hours < 1 || hours > 40)
      errs.weeklyHours = t('onboarding.goalsErrors.hoursRange');
    if (preferredDays.length === 0) errs.preferredDays = t('onboarding.goalsErrors.preferredDays');
    return errs;
  }

  function togglePreferredDay(day: string): void {
    setPreferredDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  }

  const routeState = location.state as { previewStateLost?: boolean } | null;

  return (
    <div className="page-content onboarding-page">
      <h1>{t('onboarding.goalsTitle')}</h1>
      <p className="onboarding-description">{t('onboarding.goalsDescription')}</p>
      {routeState?.previewStateLost && (
        <div className="state-notice state-notice-info" role="status">
          <strong>{t('preview.stateLostTitle')}</strong>
          <p>{t('preview.stateLostDescription')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="onboarding-form">
        <div className="form-group">
          <label htmlFor="enrollmentYear">{t('onboarding.goals.enrollmentYear')}</label>
          <input
            id="enrollmentYear"
            type="text"
            inputMode="numeric"
            value={enrollmentYear}
            onChange={(e) => setEnrollmentYear(e.target.value)}
            aria-invalid={!!errors.enrollmentYear}
            aria-describedby={errors.enrollmentYear ? 'enrollmentYear-error' : undefined}
          />
          {errors.enrollmentYear && (
            <p id="enrollmentYear-error" className="field-error" role="alert">
              {errors.enrollmentYear}
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="examDate">{t('onboarding.goals.examDate')}</label>
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            aria-invalid={!!errors.examDate}
            aria-describedby={errors.examDate ? 'examDate-error' : undefined}
          />
          {errors.examDate && (
            <p id="examDate-error" className="field-error" role="alert">
              {errors.examDate}
            </p>
          )}
        </div>

        <fieldset className="form-fieldset">
          <legend>{t('onboarding.goals.targetUniversity')}</legend>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isUndecided}
              onChange={(e) => setIsUndecided(e.target.checked)}
            />
            {t('onboarding.goals.undecided')}
          </label>
          {!isUndecided && (
            <select
              value={targetUniversity}
              onChange={(e) => setTargetUniversity(e.target.value)}
              aria-label={t('onboarding.goals.universitySelect')}
            >
              <option value="">{t('onboarding.goals.selectUniversity')}</option>
              <option value="sample-university-a">{t('onboarding.goals.sampleUniversityA')}</option>
              <option value="sample-university-b">{t('onboarding.goals.sampleUniversityB')}</option>
            </select>
          )}
        </fieldset>

        <div className="form-group">
          <label htmlFor="targetMajor">{t('onboarding.goals.targetMajor')}</label>
          <input
            id="targetMajor"
            type="text"
            value={targetMajor}
            onChange={(e) => setTargetMajor(e.target.value)}
            aria-invalid={!!errors.targetMajor}
            aria-describedby={errors.targetMajor ? 'targetMajor-error' : undefined}
          />
          {errors.targetMajor && (
            <p id="targetMajor-error" className="field-error" role="alert">
              {errors.targetMajor}
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="programType">{t('onboarding.goals.programType')}</label>
          <select
            id="programType"
            value={programType}
            onChange={(e) => setProgramType(e.target.value)}
          >
            <option value="undergraduate">{t('onboarding.goals.undergraduate')}</option>
            <option value="scholarship">{t('onboarding.goals.scholarship')}</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="languageOfInstruction">
            {t('onboarding.goals.languageOfInstruction')}
          </label>
          <select
            id="languageOfInstruction"
            value={languageOfInstruction}
            onChange={(e) => setLanguageOfInstruction(e.target.value)}
          >
            <option value="en">English</option>
            <option value="zh-CN">{t('studentActivation.languages.zh-CN')}</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="weeklyHours">{t('onboarding.goals.weeklyHours')}</label>
          <input
            id="weeklyHours"
            type="number"
            min="1"
            max="40"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            aria-invalid={!!errors.weeklyHours}
            aria-describedby={errors.weeklyHours ? 'weeklyHours-error' : undefined}
          />
          {errors.weeklyHours && (
            <p id="weeklyHours-error" className="field-error" role="alert">
              {errors.weeklyHours}
            </p>
          )}
        </div>

        <fieldset
          className="form-fieldset"
          aria-describedby={errors.preferredDays ? 'preferred-days-error' : undefined}
        >
          <legend>{t('onboarding.goals.preferredDays')}</legend>
          <div className="day-options">
            {['mon', 'wed', 'fri', 'sat', 'sun'].map((day) => (
              <label key={day} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferredDays.includes(day)}
                  onChange={() => togglePreferredDay(day)}
                />
                {t(`onboarding.goals.days.${day}`)}
              </label>
            ))}
          </div>
          {errors.preferredDays && (
            <p id="preferred-days-error" className="field-error" role="alert">
              {errors.preferredDays}
            </p>
          )}
        </fieldset>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('onboarding.goalsSubmitting') : t('onboarding.goalsSubmit')}
        </button>
      </form>
    </div>
  );
}
