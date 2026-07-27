import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { createSampleReceipt } from '../fixtures';
import type { OrderStatus } from '../models/types';
import { sampleProducts } from '../fixtures';
import { formatDateTime, formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

const STATUS_KEY: Record<OrderStatus, string> = {
  pending: 'commerce.orders.statusPending',
  paid: 'commerce.orders.statusPaid',
  failed: 'commerce.orders.statusFailed',
  expired: 'commerce.orders.statusExpired',
  cancelled: 'commerce.orders.statusCancelled',
  refunded: 'commerce.orders.statusRefunded',
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'status-warning',
  paid: 'status-success',
  failed: 'status-danger',
  expired: 'status-danger',
  cancelled: 'status-danger',
  refunded: 'status-warning',
};

export function OrderDetailPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const { state } = useConsumer();

  const order = state.orders.find((o) => o.id === orderId) ?? null;

  if (!order) {
    return (
      <div className="order-detail">
        <h1>{t('commerce.orderDetail.title')}</h1>
        <p className="order-detail-not-found">{t('commerce.orderDetail.notFound')}</p>
        <Link to="/orders" className="btn-secondary">
          {t('commerce.orders.title')}
        </Link>
      </div>
    );
  }

  const receipt = order.status === 'paid' ? createSampleReceipt(order) : null;
  const entitlement = state.entitlements.find((e) => e.sourceOrderId === order.id) ?? null;
  const productFixture = sampleProducts.find((product) => product.id === order.productId);
  const productName = productFixture ? localizeProduct(productFixture, t).name : order.productName;

  return (
    <div className="order-detail">
      <h1>{t('commerce.orderDetail.title')}</h1>

      <p className="order-detail-sample-mark">{t('commerce.instructions.sampleNotice')}</p>

      <section aria-labelledby="order-info-heading">
        <h2 id="order-info-heading">{t('commerce.orderDetail.title')}</h2>
        <dl className="order-detail-fields">
          <dt>{t('commerce.orderDetail.orderId')}</dt>
          <dd>
            <code>{order.id}</code>{' '}
          </dd>

          <dt>{t('commerce.orderDetail.product')}</dt>
          <dd>{productName}</dd>

          <dt>{t('commerce.orderDetail.payer')}</dt>
          <dd>{order.payerName}</dd>

          <dt>{t('commerce.orderDetail.recipient')}</dt>
          <dd>{order.recipientName}</dd>

          <dt>{t('commerce.orderDetail.amount')}</dt>
          <dd>{formatIDR(order.amountIDR, i18n.language)}</dd>

          <dt>{t('commerce.orderDetail.validity')}</dt>
          <dd>{t('commerce.checkout.validityDays', { days: order.validityDays })}</dd>

          <dt>{t('commerce.orderDetail.paymentMethod')}</dt>
          <dd>{t(`commerce.payment.methods.${order.paymentMethod}`)}</dd>

          <dt>{t('commerce.orderDetail.status')}</dt>
          <dd>
            <span className={`order-status-badge ${STATUS_CLASS[order.status]}`}>
              {t(STATUS_KEY[order.status])}
            </span>
          </dd>

          <dt>{t('commerce.orderDetail.providerRef')}</dt>
          <dd>
            <code>{order.providerReference}</code>
          </dd>

          <dt>{t('commerce.orderDetail.reconciliation')}</dt>
          <dd>
            {order.reconciliationTime
              ? formatDateTime(order.reconciliationTime, i18n.language)
              : t('commerce.orderDetail.notReconciled')}
          </dd>
        </dl>
      </section>

      {order.status === 'pending' && (
        <section
          className="order-detail-pending state-notice state-notice-info"
          aria-labelledby="order-pending-heading"
        >
          <h2 id="order-pending-heading">{t('commerce.orderDetail.pendingNote')}</h2>
        </section>
      )}

      {receipt && (
        <section aria-labelledby="order-receipt-heading">
          <h2 id="order-receipt-heading">{t('commerce.orderDetail.receiptSection')}</h2>
          <dl className="order-receipt-fields">
            <dt>{t('commerce.orderDetail.receiptNumber')}</dt>
            <dd>
              <code>{receipt.receiptNumber}</code>
            </dd>
            <dt>{t('commerce.orderDetail.reconciliation')}</dt>
            <dd>{formatDateTime(receipt.issuedAt, i18n.language)}</dd>
            <dt>{t('commerce.orderDetail.amount')}</dt>
            <dd>{formatIDR(receipt.amountIDR, i18n.language)}</dd>
          </dl>
          <p className="order-receipt-note">{t('commerce.orderDetail.receiptNote')}</p>
        </section>
      )}

      {entitlement && (
        <section aria-labelledby="order-entitlement-heading">
          <h2 id="order-entitlement-heading">{t('commerce.entitlements.title')}</h2>
          <p>
            <Link to={`/entitlements/${entitlement.id}/renew`} className="btn-secondary">
              {t('commerce.orderDetail.entitlementLink')}
            </Link>
          </p>
        </section>
      )}

      <nav className="order-detail-actions" aria-label={t('commerce.orders.title')}>
        {order.status === 'paid' && (
          <Link to={`/orders/${order.id}/refund`} className="btn-secondary">
            {t('commerce.orderDetail.refundLink')}
          </Link>
        )}
        {order.status === 'expired' && (
          <Link to="/checkout" className="btn-secondary">
            {t('commerce.orderDetail.renewLink')}
          </Link>
        )}
        {(order.status === 'failed' || order.status === 'expired') && (
          <Link to="/support/new" className="btn-secondary">
            {t('commerce.orderDetail.supportLink')}
          </Link>
        )}
        <Link to="/orders" className="btn-secondary">
          {t('commerce.orders.title')}
        </Link>
      </nav>
    </div>
  );
}
