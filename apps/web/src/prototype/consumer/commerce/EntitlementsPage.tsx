import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { EntitlementStatus } from '../models/types';
import { sampleProducts } from '../fixtures';
import { formatDate } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

const STATUS_KEY: Record<EntitlementStatus, string> = {
  active: 'commerce.entitlements.statusActive',
  expiring: 'commerce.entitlements.statusExpiring',
  expired: 'commerce.entitlements.statusExpired',
  pendingReconciliation: 'commerce.entitlements.statusPending',
};

const STATUS_CLASS: Record<EntitlementStatus, string> = {
  active: 'status-success',
  expiring: 'status-warning',
  expired: 'status-danger',
  pendingReconciliation: 'status-warning',
};

export function EntitlementsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { state } = useConsumer();

  return (
    <div className="entitlements-page">
      <h1>{t('commerce.entitlements.title')}</h1>

      {state.entitlements.length === 0 ? (
        <section
          className="entitlements-empty empty-state"
          aria-labelledby="entitlements-empty-heading"
        >
          <h2 id="entitlements-empty-heading">{t('commerce.entitlements.empty')}</h2>
          <Link to="/checkout" className="btn-primary">
            {t('commerce.checkout.selectProduct')}
          </Link>
        </section>
      ) : (
        <ul className="entitlements-list" role="list">
          {state.entitlements.map((entitlement) => {
            const productFixture = sampleProducts.find(
              (product) => product.id === entitlement.productId,
            );
            const productName = productFixture
              ? localizeProduct(productFixture, t).name
              : entitlement.productName;
            return (
              <li key={entitlement.id} className="entitlements-item">
                <div className="entitlements-item-header">
                  <span className="entitlements-item-product">{productName}</span>
                  <span className={`entitlements-item-status ${STATUS_CLASS[entitlement.status]}`}>
                    {t(STATUS_KEY[entitlement.status])}
                  </span>
                </div>
                <dl className="entitlements-item-details">
                  <dt>{t('commerce.orderDetail.recipient')}</dt>
                  <dd>{entitlement.recipientName}</dd>
                  <dt>{t('commerce.entitlements.validity')}</dt>
                  <dd>{formatDate(entitlement.expiryDate, i18n.language)}</dd>
                  <dt>{t('commerce.entitlements.limits')}</dt>
                  <dd>{t('prototypeData.entitlementUsage')}</dd>
                </dl>
                {(entitlement.status === 'expiring' || entitlement.status === 'expired') && (
                  <Link
                    to={`/entitlements/${entitlement.id}/renew`}
                    className="btn-secondary entitlements-renew-link"
                  >
                    {t('commerce.entitlements.renew')}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
