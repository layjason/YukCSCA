import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { SupportCategory, SupportTicket } from '@/prototype/consumer/models/types';

const CATEGORY_OPTIONS: SupportCategory[] = [
  'account',
  'payment',
  'content',
  'aiAnswer',
  'tutoring',
];

interface FormErrors {
  description?: string;
}

export function SupportNewPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const [category, setCategory] = useState<SupportCategory>('account');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const safeContext = state.activeOrderId ?? '';

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!description.trim()) {
      next.description = t('support.errors.descriptionRequired');
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const ticketNumber = state.supportTickets.length + 1;
    const ticket: SupportTicket = {
      id: `TKT-PX2-${String(ticketNumber).padStart(3, '0')}`,
      category,
      description: description.trim(),
      contextLink: category === 'payment' ? safeContext : '',
      status: 'open',
      createdAt: '2026-07-24T12:00:00Z',
      replies: [],
    };

    dispatch({ type: 'SUPPORT_SUBMIT', ticket });
    navigate(`/support/${ticket.id}`);
  }

  return (
    <div className="page-content support-page support-new-page">
      <h1>{t('support.new.title')}</h1>

      <form onSubmit={handleSubmit} noValidate className="support-form">
        <div className="form-group">
          <label htmlFor="support-category">{t('support.new.category')}</label>
          <select
            id="support-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as SupportCategory)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {t(`support.categories.${option}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="support-description">{t('support.new.description')}</label>
          <textarea
            id="support-description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'support-description-error' : undefined}
          />
          {errors.description && (
            <p id="support-description-error" className="field-error" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {category === 'payment' && safeContext && (
          <div className="form-group">
            <span className="form-label">{t('support.new.contextLink')}</span>
            <p className="support-safe-context">{safeContext}</p>
          </div>
        )}

        <p className="support-guidance" role="note">
          {t('support.new.safetyNote')}
        </p>

        <button type="submit" className="btn-primary">
          {t('support.new.submit')}
        </button>
      </form>
    </div>
  );
}
