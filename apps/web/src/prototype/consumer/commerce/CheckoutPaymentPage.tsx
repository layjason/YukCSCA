import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { sampleProducts, samplePaymentMethods, createSampleOrder } from '../fixtures';
import type { PaymentMethodId } from '../models/types';
import { formatIDR } from '../formatters';
import { localizeProduct } from '../localizedFixtures';

export function CheckoutPaymentPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const selectedProductFixture =
    sampleProducts.find((p) => p.id === state.selectedProductId) ?? null;
  const selectedProduct = selectedProductFixture
    ? localizeProduct(selectedProductFixture, t)
    : null;
  const selectedMethod = state.selectedPaymentMethod;
  const isStudentIntent = state.credentialSession.roleIntent === 'student';
  const payerName = state.parentProfile?.name || state.credentialSession.displayEmail;
  const recipientName = isStudentIntent
    ? state.credentialSession.displayEmail
    : state.linkedStudent?.name;

  function handleSelectMethod(method: PaymentMethodId): void {
    dispatch({ type: 'COMMERCE_SELECT_PAYMENT', method });
  }

  function handleConfirm(): void {
    if (
      !selectedProduct ||
      !selectedMethod ||
      !state.selectedRecipientId ||
      !payerName ||
      !recipientName
    ) {
      return;
    }

    const intentKey = `${selectedProduct.id}-${state.selectedRecipientId}-${selectedMethod}`
      .replace(/[^a-z0-9]+/gi, '-')
      .toUpperCase();

    const order = createSampleOrder({
      id: `ORD-PX2-${intentKey}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      subject: selectedProduct.subject,
      examLanguage: selectedProduct.examLanguage,
      payerName,
      recipientId: state.selectedRecipientId,
      recipientName,
      amountIDR: selectedProduct.priceIDR,
      validityDays: selectedProduct.validityDays,
      paymentMethod: selectedMethod,
      providerReference: `SAMPLE-${intentKey}`,
    });

    dispatch({ type: 'COMMERCE_CREATE_ORDER', order });
    navigate('/checkout/instructions');
  }

  if (!selectedProduct) {
    return (
      <div className="checkout-payment-page">
        <h1>{t('commerce.payment.title')}</h1>
        <p className="checkout-payment-empty">{t('commerce.checkout.selectProduct')}</p>
      </div>
    );
  }

  return (
    <div className="checkout-payment-page">
      <h1>{t('commerce.payment.title')}</h1>

      <section aria-labelledby="payment-summary-heading">
        <h2 id="payment-summary-heading">{t('commerce.checkout.product')}</h2>
        <dl className="payment-summary">
          <dt>{t('commerce.checkout.product')}</dt>
          <dd>{selectedProduct.name}</dd>
          <dt>{t('commerce.checkout.amount')}</dt>
          <dd>{formatIDR(selectedProduct.priceIDR, i18n.language)}</dd>
          <dt>{t('commerce.checkout.payer')}</dt>
          <dd>{payerName}</dd>
          <dt>{t('commerce.orderDetail.recipient')}</dt>
          <dd>{recipientName}</dd>
          <dt>{t('commerce.checkout.validity')}</dt>
          <dd>{t('commerce.checkout.validityDays', { days: selectedProduct.validityDays })}</dd>
          <dt>{t('commerce.checkout.coverageNote')}</dt>
          <dd>
            {t('commerce.checkout.missingModules', {
              modules: selectedProduct.missingModules.join(', '),
            })}
          </dd>
        </dl>
        <p>{t('commerce.checkout.deadlineNote')}</p>
        <p>{t('commerce.renewal.explicitNote')}</p>
      </section>

      <section aria-labelledby="payment-method-heading">
        <h2 id="payment-method-heading">{t('commerce.payment.selectMethod')}</h2>

        <fieldset className="payment-methods">
          <legend className="visually-hidden">{t('commerce.payment.selectMethod')}</legend>
          {samplePaymentMethods.map((method) => (
            <label
              key={method.id}
              className={`payment-method-card${method.available ? '' : ' payment-method-disabled'}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={selectedMethod === method.id}
                disabled={!method.available}
                onChange={() => handleSelectMethod(method.id)}
              />
              <span className="payment-method-name">
                {t(`commerce.payment.methods.${method.id}`)}
              </span>
              {!method.available && (
                <span className="payment-method-reason">{t('commerce.payment.unavailable')}</span>
              )}
            </label>
          ))}
        </fieldset>
      </section>

      {selectedMethod === 'qris' && (
        <div className="payment-qr-placeholder" aria-label={t('commerce.payment.qrNotice')}>
          <span className="payment-qr-box">{t('commerce.payment.qrNotice')}</span>
        </div>
      )}

      <p className="payment-no-charge">{t('commerce.payment.noCharge')}</p>

      <button
        type="button"
        className="btn-primary payment-confirm"
        disabled={!selectedMethod}
        onClick={handleConfirm}
      >
        {t('commerce.payment.confirm')}
      </button>
    </div>
  );
}
