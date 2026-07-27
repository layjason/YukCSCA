import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { OrderStatus } from '../models/types';
import { sampleProducts } from '../fixtures';
import { formatDate, formatIDR } from '../formatters';
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

export function OrdersPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { state } = useConsumer();

  return (
    <div className="orders-page">
      <h1>{t('commerce.orders.title')}</h1>

      {state.orders.length === 0 ? (
        <section className="orders-empty empty-state" aria-labelledby="orders-empty-heading">
          <h2 id="orders-empty-heading">{t('commerce.orders.empty')}</h2>
          <Link to="/checkout" className="btn-primary">
            {t('commerce.checkout.selectProduct')}
          </Link>
        </section>
      ) : (
        <ul className="orders-list" role="list">
          {state.orders.map((order) => {
            const productFixture = sampleProducts.find((product) => product.id === order.productId);
            const productName = productFixture
              ? localizeProduct(productFixture, t).name
              : order.productName;
            return (
              <li key={order.id} className="orders-item">
                <Link to={`/orders/${order.id}`} className="orders-item-link">
                  <span className="orders-item-product">{productName}</span>
                  <span className="orders-item-amount">
                    {formatIDR(order.amountIDR, i18n.language)}
                  </span>
                  <span className={`orders-item-status ${STATUS_CLASS[order.status]}`}>
                    {t(STATUS_KEY[order.status])}
                  </span>
                  <span className="orders-item-date">
                    {formatDate(order.createdAt, i18n.language)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
