import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { RefundRequest } from '../models/types';

const REFUND_REASONS = ['reasonDuplicate', 'reasonService', 'reasonOther'] as const;
type RefundReason = (typeof REFUND_REASONS)[number];

export function RefundPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const { state, dispatch } = useConsumer();

  const [reason, setReason] = useState<RefundReason | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState('');

  const order = state.orders.find((o) => o.id === orderId) ?? null;

  if (!order) {
    return (
      <div className="refund-page">
        <h1>{t('commerce.refund.title')}</h1>
        <p>{t('commerce.orderDetail.notFound')}</p>
        <Link to="/orders" className="btn-secondary">
          {t('commerce.orders.title')}
        </Link>
      </div>
    );
  }

  function handleSubmit(): void {
    if (!reason || !order) return;

    const request: RefundRequest = {
      id: `REF-PX2-${order.id.slice(-3)}`,
      orderId: order.id,
      reason: t(`commerce.refund.${reason}`),
      status: 'pendingReview',
      submittedAt: '2026-07-24T11:00:00Z',
      effectOnAccess: t('commerce.refund.effectOnAccess'),
    };

    dispatch({ type: 'REFUND_SUBMIT', request });
    setCaseId(request.id);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="refund-page">
        <h1>{t('commerce.refund.title')}</h1>
        <section
          className="refund-submitted state-notice state-notice-info"
          aria-labelledby="refund-submitted-heading"
        >
          <h2 id="refund-submitted-heading">{t('commerce.refund.submitted')}</h2>
          <dl className="refund-case-details">
            <dt>{t('commerce.refund.caseId')}</dt>
            <dd>
              <code>{caseId}</code>
            </dd>
            <dt>{t('commerce.orderDetail.status')}</dt>
            <dd>{t('commerce.refund.statusPendingReview')}</dd>
          </dl>
          <p className="refund-no-promise">{t('commerce.refund.noPromise')}</p>
        </section>
        <Link to={`/orders/${order.id}`} className="btn-secondary">
          {t('commerce.orders.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="refund-page">
      <h1>{t('commerce.refund.title')}</h1>

      <section aria-labelledby="refund-eligibility-heading">
        <h2 id="refund-eligibility-heading">{t('commerce.refund.eligibility')}</h2>
      </section>

      <section aria-labelledby="refund-reason-heading">
        <h2 id="refund-reason-heading">{t('commerce.refund.reason')}</h2>
        <fieldset className="refund-reasons">
          <legend className="visually-hidden">{t('commerce.refund.reason')}</legend>
          {REFUND_REASONS.map((r) => (
            <label key={r} className="refund-reason-option">
              <input
                type="radio"
                name="refund-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span>{t(`commerce.refund.${r}`)}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section aria-labelledby="refund-evidence-heading">
        <h2 id="refund-evidence-heading">{t('commerce.refund.evidence')}</h2>
        <p className="refund-evidence-note">{t('commerce.refund.evidenceNote')}</p>
      </section>

      <section aria-labelledby="refund-effect-heading">
        <h2 id="refund-effect-heading">{t('commerce.refund.effectOnAccess')}</h2>
      </section>

      <button
        type="button"
        className="btn-primary refund-submit"
        disabled={!reason}
        onClick={handleSubmit}
      >
        {t('commerce.refund.submit')}
      </button>

      <p className="refund-disclaimer">{t('commerce.refund.noPromise')}</p>
    </div>
  );
}
