import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sampleProducts } from '../fixtures';
import { formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

export function ProductsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <div className="products-page">
      <header className="products-page-header">
        <h1>{t('public.products.title')}</h1>
        <p className="products-page-subtitle">{t('public.products.subtitle')}</p>
      </header>

      {sampleProducts.length === 0 ? (
        <p className="products-empty">{t('public.products.notFoundDesc')}</p>
      ) : (
        <ul className="products-list">
          {sampleProducts.map((fixtureProduct) => {
            const product = localizeProduct(fixtureProduct, t);
            const totalModules = product.includedModules.length;
            const coveredModules = product.includedModules.filter((m) => m.covered).length;
            return (
              <li key={product.id} className="product-card">
                <span className="preview-badge">{t('preview.badge')}</span>
                <h2 className="product-card-name">{product.name}</h2>
                <dl className="product-card-meta">
                  <div className="product-card-meta-row">
                    <dt>{t('public.productDetail.subject')}</dt>
                    <dd>{product.subject}</dd>
                  </div>
                  <div className="product-card-meta-row">
                    <dt>{t('public.productDetail.examLanguage')}</dt>
                    <dd>{product.examLanguage}</dd>
                  </div>
                  <div className="product-card-meta-row">
                    <dt>{t('public.productDetail.price')}</dt>
                    <dd>{formatIDR(product.priceIDR, i18n.language)}</dd>
                  </div>
                  <div className="product-card-meta-row">
                    <dt>{t('public.productDetail.validity')}</dt>
                    <dd>{t('public.productDetail.days', { days: product.validityDays })}</dd>
                  </div>
                </dl>
                <p className="product-card-coverage">
                  {t('public.products.coverage', {
                    covered: coveredModules,
                    total: totalModules,
                  })}
                </p>
                <Link to={`/products/${product.id}`} className="btn-secondary product-card-link">
                  {t('public.products.viewDetail')}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
