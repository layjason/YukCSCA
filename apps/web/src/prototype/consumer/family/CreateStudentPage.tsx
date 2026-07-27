import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { samplePendingStudent } from '@/prototype/consumer/fixtures';

interface FormErrors {
  name?: string;
  email?: string;
  conflict?: string;
}

export function CreateStudentPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { dispatch } = useConsumer();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!name.trim()) {
      next.name = t('family.createStudent.errorNameRequired');
    }
    if (!email.trim()) {
      next.email = t('family.createStudent.errorEmailFormat');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = t('family.createStudent.errorEmailFormat');
    }
    if (name.trim().toLowerCase() === 'duplicate') {
      next.conflict = t('family.createStudent.errorDuplicate');
    }
    return next;
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    dispatch({
      type: 'FAMILY_CREATE_STUDENT',
      student: {
        ...samplePendingStudent,
        name: name.trim(),
        email: email.trim(),
      },
    });
    navigate('/parent/family');
  }

  return (
    <div className="family-create-page">
      <h1>{t('family.createStudent.title')}</h1>

      <form className="family-create-form" onSubmit={handleSubmit} noValidate>
        {errors.conflict && (
          <p className="form-error form-error-conflict" role="alert">
            {errors.conflict}
          </p>
        )}

        <div className="form-field">
          <label htmlFor="student-name">{t('family.createStudent.name')}</label>
          <input
            id="student-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'student-name-error' : undefined}
            autoComplete="off"
          />
          {errors.name && (
            <p id="student-name-error" className="form-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="student-email">{t('family.createStudent.email')}</label>
          <input
            id="student-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'student-email-error' : undefined}
            autoComplete="off"
          />
          {errors.email && (
            <p id="student-email-error" className="form-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary">
          {t('family.createStudent.submit')}
        </button>
      </form>

      <section className="family-create-privacy" aria-labelledby="create-privacy-heading">
        <h2 id="create-privacy-heading">{t('family.create.privacyTitle')}</h2>
        <p>{t('family.createStudent.privacyBoundary')}</p>
      </section>
    </div>
  );
}
