import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { createSampleEntitlement } from '../fixtures';
import type { OrderStatus } from '../models/types';

export function CheckoutInstructionsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const activeOrder = state.orders.find((o) => o.id === state.activeOrderId) ?? null;

  if (!activeOrder) {
    return (
      <div className="checkout-instructions-page">
        <h1>{t('commerce.instructions.title')}</h1>
        <p>{t('commerce.orders.empty')}</p>
      </div>
    );
  }

  function handleSimulateOutcome(status: OrderStatus): void {
    if (!activeOrder) return;
    dispatch({ type: 'COMMERCE_ORDER_OUTCOME', orderId: activeOrder.id, status });

    if (status === 'paid') {
      const entitlement = createSampleEntitlement({
        id: activeOrder.id.replace('ORD-', 'ENT-'),
        productId: activeOrder.productId,
        productName: activeOrder.productName,
        subject: activeOrder.subject,
        examLanguage: activeOrder.examLanguage,
        recipientId: activeOrder.recipientId,
        recipientName: activeOrder.recipientName,
        sourceOrderId: activeOrder.id,
      });
      dispatch({ type: 'COMMERCE_GRANT_ENTITLEMENT', entitlement });
    }

    navigate(`/orders/${activeOrder.id}`);
  }

  return (
    <div className="checkout-instructions-page">
      <h1>{t('commerce.instructions.title')}</h1>
      <p className="instructions-sample-notice">{t('commerce.instructions.sampleNotice')}</p>

      <section aria-labelledby="instructions-method-heading">
        <h2 id="instructions-method-heading">{t('commerce.orderDetail.paymentMethod')}</h2>

        {activeOrder.paymentMethod === 'qris' && (
          <div className="instructions-qris">
            <div
              className="instructions-qr-placeholder"
              role="img"
              aria-label={t('commerce.instructions.qrisPlaceholder')}
            >
              <span>{t('commerce.instructions.qrisPlaceholder')}</span>
            </div>
          </div>
        )}

        {activeOrder.paymentMethod === 'bankVa' && (
          <div className="instructions-bank-va">
            <p className="instructions-va-number">
              <strong>{t('commerce.instructions.vaNumber')}</strong>{' '}
              <code className="instructions-sample-value">SAMPLE-VA-NOT-PAYABLE</code>
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="instructions-authority-heading">
        <h2 id="instructions-authority-heading">{t('commerce.instructions.authorityNote')}</h2>
        <p>{t('commerce.instructions.browserNote')}</p>
      </section>

      <section className="instructions-simulate" aria-labelledby="instructions-simulate-heading">
        <h2 id="instructions-simulate-heading">{t('commerce.instructions.simulateOutcome')}</h2>
        <div className="instructions-simulate-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSimulateOutcome('paid')}
          >
            {t('commerce.instructions.markPaid')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSimulateOutcome('failed')}
          >
            {t('commerce.instructions.markFailed')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSimulateOutcome('expired')}
          >
            {t('commerce.instructions.markExpired')}
          </button>
        </div>
      </section>
    </div>
  );
}
