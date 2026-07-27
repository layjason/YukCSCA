import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { sampleProducts, createSampleOrder } from '../fixtures';
import type { EntitlementStatus } from '../models/types';
import { formatDate, formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

const STATUS_KEY: Record<EntitlementStatus, string> = {
  active: 'commerce.entitlements.statusActive',
  expiring: 'commerce.entitlements.statusExpiring',
  expired: 'commerce.entitlements.statusExpired',
  pendingReconciliation: 'commerce.entitlements.statusPending',
};

export function EntitlementRenewPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { entitlementId } = useParams<{ entitlementId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const entitlement = state.entitlements.find((e) => e.id === entitlementId) ?? null;

  if (!entitlement) {
    return (
      <div className="entitlement-renew-page">
        <h1>{t('commerce.renewal.title')}</h1>
        <p>{t('commerce.orderDetail.notFound')}</p>
      </div>
    );
  }

  const productFixture = sampleProducts.find((p) => p.id === entitlement.productId) ?? null;
  const product = productFixture ? localizeProduct(productFixture, t) : null;
  const renewalAmount = product?.priceIDR ?? 0;
  const renewalValidity = product?.validityDays ?? 90;

  function handleConfirmRenewal(): void {
    if (!entitlement || !product) return;

    const order = createSampleOrder({
      id: `ORD-PX2-REN-${entitlement.id.slice(-3)}`,
      productId: product.id,
      productName: product.name,
      subject: product.subject,
      examLanguage: product.examLanguage,
      recipientId: entitlement.recipientId,
      recipientName: entitlement.recipientName,
      amountIDR: product.priceIDR,
      validityDays: product.validityDays,
      paymentMethod: 'qris',
      providerReference: `SAMPLE-RENEW-REF-${entitlement.id.slice(-3)}`,
    });

    dispatch({ type: 'COMMERCE_CREATE_ORDER', order });
    navigate('/checkout/instructions');
  }

  return (
    <div className="entitlement-renew-page">
      <h1>{t('commerce.renewal.title')}</h1>

      <section aria-labelledby="renew-current-heading">
        <h2 id="renew-current-heading">{t('commerce.entitlements.title')}</h2>
        <dl className="renew-current-details">
          <dt>{t('commerce.orderDetail.product')}</dt>
          <dd>{product?.name ?? entitlement.productName}</dd>
          <dt>{t('commerce.orderDetail.recipient')}</dt>
          <dd>{entitlement.recipientName}</dd>
          <dt>{t('commerce.renewal.currentExpiry')}</dt>
          <dd>{formatDate(entitlement.expiryDate, i18n.language)}</dd>
          <dt>{t('commerce.orderDetail.status')}</dt>
          <dd>{t(STATUS_KEY[entitlement.status])}</dd>
        </dl>
      </section>

      <section aria-labelledby="renew-new-heading">
        <h2 id="renew-new-heading">{t('commerce.renewal.newValidity')}</h2>
        <dl className="renew-new-details">
          <dt>{t('commerce.checkout.validity')}</dt>
          <dd>{t('commerce.renewal.newValidityDays', { days: renewalValidity })}</dd>
          <dt>{t('commerce.renewal.amount')}</dt>
          <dd>{formatIDR(renewalAmount, i18n.language)}</dd>
        </dl>
      </section>

      <section
        className="renew-notice state-notice state-notice-info"
        aria-labelledby="renew-notice-heading"
      >
        <h2 id="renew-notice-heading">{t('commerce.renewal.explicitNote')}</h2>
        <p>{t('commerce.renewal.notAutomatic')}</p>
      </section>

      <button type="button" className="btn-primary renew-confirm" onClick={handleConfirmRenewal}>
        {t('commerce.renewal.confirm')}
      </button>
    </div>
  );
}
