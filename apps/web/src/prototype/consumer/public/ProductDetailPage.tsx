import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { sampleProducts } from '../fixtures';
import { formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

export function ProductDetailPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useConsumer();
  const fixtureProduct = sampleProducts.find((p) => p.id === productId);

  if (!fixtureProduct) {
    return (
      <div className="product-detail-page product-detail-not-found">
        <h1>{t('public.products.notFound')}</h1>
        <p>{t('public.products.notFoundDesc')}</p>
        <Link to="/products" className="btn-secondary">
          {t('public.products.title')}
        </Link>
      </div>
    );
  }

  const product = localizeProduct(fixtureProduct, t);

  return (
    <div className="product-detail-page">
      <p className="product-detail-notice" role="note">
        {t('public.productDetail.previewNotice')}
      </p>

      <h1>{product.name}</h1>

      <dl className="product-detail-overview">
        <div className="product-detail-row">
          <dt>{t('public.productDetail.subject')}</dt>
          <dd>{product.subject}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.examLanguage')}</dt>
          <dd>{product.examLanguage}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.intendedLearner')}</dt>
          <dd>{product.intendedLearner}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.validity')}</dt>
          <dd>{t('public.productDetail.days', { days: product.validityDays })}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.price')}</dt>
          <dd>{formatIDR(product.priceIDR, i18n.language)}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.renewalBehavior')}</dt>
          <dd>{product.renewalBehavior}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.practiceScope')}</dt>
          <dd>{product.practiceScope}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.terminologySupport')}</dt>
          <dd>{product.terminologySupport}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.aiAllowance')}</dt>
          <dd>{product.aiAllowance}</dd>
        </div>
        <div className="product-detail-row">
          <dt>{t('public.productDetail.mockAllowance')}</dt>
          <dd>{product.mockAllowance}</dd>
        </div>
      </dl>

      <section className="product-detail-modules" aria-labelledby="included-modules-heading">
        <h2 id="included-modules-heading">{t('public.productDetail.includedModules')}</h2>
        <ul className="product-modules">
          {product.includedModules.map((module) => (
            <li
              key={module.name}
              className={
                module.covered ? 'product-module is-covered' : 'product-module is-not-covered'
              }
            >
              <span className="product-module-name">{module.name}</span>
              <span
                className={
                  module.covered
                    ? 'product-module-status is-covered'
                    : 'product-module-status is-not-covered'
                }
              >
                {module.covered
                  ? t('public.productDetail.covered')
                  : t('public.productDetail.notCovered')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="product-detail-missing" aria-labelledby="missing-modules-heading">
        <h2 id="missing-modules-heading">{t('public.productDetail.missingModules')}</h2>
        {product.missingModules.length > 0 ? (
          <ul className="product-missing-list">
            {product.missingModules.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="product-missing-none">{t('public.productDetail.missingModulesNone')}</p>
        )}
      </section>

      <section className="product-detail-trial-benefits" aria-labelledby="trial-benefits-heading">
        <h2 id="trial-benefits-heading">{t('public.productDetail.trialBenefits')}</h2>
        <ul className="product-trial-benefits">
          {product.trialBenefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </section>

      <section className="product-detail-trial-limits" aria-labelledby="trial-limits-heading">
        <h2 id="trial-limits-heading">{t('public.productDetail.trialLimits')}</h2>
        <ul className="product-trial-limits">
          {product.trialLimits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <div className="product-detail-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            dispatch({ type: 'COMMERCE_SELECT_PRODUCT', productId: product.id });
            navigate('/checkout');
          }}
        >
          {t('public.productDetail.startCheckout')}
        </button>
      </div>
    </div>
  );
}
