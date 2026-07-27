import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { sampleProducts } from '../fixtures';
import { formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

export function CheckoutPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const selectedProductFixture =
    sampleProducts.find((p) => p.id === state.selectedProductId) ?? null;
  const selectedProduct = selectedProductFixture
    ? localizeProduct(selectedProductFixture, t)
    : null;
  const isStudentIntent = state.credentialSession.roleIntent === 'student';
  const recipient = isStudentIntent ? null : state.linkedStudent;
  const payerName =
    state.parentProfile?.name ?? state.credentialSession.displayEmail ?? 'Preview payer';

  function handleSelectProduct(productId: string): void {
    dispatch({ type: 'COMMERCE_SELECT_PRODUCT', productId });
  }

  function handleSelectRecipient(recipientId: string): void {
    dispatch({ type: 'COMMERCE_SELECT_RECIPIENT', recipientId });
  }

  function handleContinue(): void {
    if (!state.selectedProductId || !state.selectedRecipientId) return;
    dispatch({ type: 'COMMERCE_SET_STEP', step: 'payment' });
    navigate('/checkout/payment');
  }

  const canContinue = selectedProduct !== null && state.selectedRecipientId !== null;

  return (
    <div className="checkout-page">
      <h1>{t('commerce.checkout.title')}</h1>

      <section aria-labelledby="checkout-payer-heading">
        <h2 id="checkout-payer-heading">{t('commerce.checkout.payer')}</h2>
        <p className="checkout-payer-name">{payerName}</p>
      </section>

      <section aria-labelledby="checkout-product-heading">
        <h2 id="checkout-product-heading">{t('commerce.checkout.selectProduct')}</h2>

        {selectedProduct ? (
          <div className="checkout-selected-product">
            <h3>{selectedProduct.name}</h3>
            <dl className="checkout-product-details">
              <dt>{t('commerce.checkout.subject')}</dt>
              <dd>{selectedProduct.subject}</dd>
              <dt>{t('commerce.checkout.examLanguage')}</dt>
              <dd>{selectedProduct.examLanguage}</dd>
              <dt>{t('commerce.checkout.amount')}</dt>
              <dd>{formatIDR(selectedProduct.priceIDR, i18n.language)}</dd>
              <dt>{t('commerce.checkout.validity')}</dt>
              <dd>{t('commerce.checkout.validityDays', { days: selectedProduct.validityDays })}</dd>
            </dl>

            <h4>{t('commerce.checkout.benefits')}</h4>
            <ul className="checkout-benefits">
              {selectedProduct.includedModules
                .filter((m) => m.covered)
                .map((m) => (
                  <li key={m.name}>{m.name}</li>
                ))}
            </ul>
            <p className="checkout-scope">{selectedProduct.practiceScope}</p>
            <p className="checkout-allowance">{selectedProduct.mockAllowance}</p>

            <h4>{t('commerce.checkout.limits')}</h4>
            <ul className="checkout-limits">
              <li>{selectedProduct.practiceScope}</li>
              <li>{selectedProduct.mockAllowance}</li>
              <li>{selectedProduct.aiAllowance}</li>
            </ul>

            <h4>{t('commerce.checkout.coverageNote')}</h4>
            <p className="checkout-coverage-note">
              {t('commerce.checkout.missingModules', {
                modules: selectedProduct.missingModules.join(', '),
              })}
            </p>

            <button
              type="button"
              className="btn-secondary checkout-change-product"
              onClick={() => dispatch({ type: 'COMMERCE_SELECT_PRODUCT', productId: null })}
            >
              {t('commerce.checkout.changeProduct')}
            </button>
          </div>
        ) : (
          <ul className="checkout-product-list" role="list">
            {sampleProducts.map((fixtureProduct) => {
              const product = localizeProduct(fixtureProduct, t);
              return (
                <li key={product.id} className="checkout-product-item">
                  <button
                    type="button"
                    className="checkout-product-option"
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    <span className="checkout-product-name">{product.name}</span>
                    <span className="checkout-product-price">
                      {formatIDR(product.priceIDR, i18n.language)}
                    </span>
                    <span className="checkout-product-validity">
                      {t('commerce.checkout.validityDays', { days: product.validityDays })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="checkout-recipient-heading">
        <h2 id="checkout-recipient-heading">{t('commerce.checkout.selectRecipient')}</h2>

        {isStudentIntent ? (
          <label className="checkout-recipient-option">
            <input
              type="radio"
              name="recipient"
              value="self"
              checked={state.selectedRecipientId === 'self'}
              onChange={() => handleSelectRecipient('self')}
            />
            <span>{t('commerce.checkout.selfRecipient')}</span>
          </label>
        ) : recipient ? (
          <label className="checkout-recipient-option">
            <input
              type="radio"
              name="recipient"
              value={recipient.id}
              checked={state.selectedRecipientId === recipient.id}
              onChange={() => handleSelectRecipient(recipient.id)}
            />
            <span>
              {recipient.name} — {t('prototypeData.products.math-english.subject')} (
              {t('prototypeData.products.math-english.examLanguage')})
            </span>
          </label>
        ) : (
          <p className="checkout-no-recipient">{t('commerce.checkout.noRecipient')}</p>
        )}
      </section>

      <section aria-labelledby="checkout-terms-heading">
        <h2 id="checkout-terms-heading">{t('commerce.checkout.termsSummary')}</h2>
        <ul className="checkout-terms-list">
          <li>{t('commerce.checkout.deadlineNote')}</li>
          <li>{t('commerce.checkout.termsSummary')}</li>
          <li>{t('commerce.renewal.explicitNote')}</li>
        </ul>
      </section>

      <button
        type="button"
        className="btn-primary checkout-continue"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {t('commerce.checkout.continueToPayment')}
      </button>
    </div>
  );
}
