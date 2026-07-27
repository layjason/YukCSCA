import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function AccountExportPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [requested, setRequested] = useState(false);

  function handleRequest(): void {
    // Preview only: no production export request is created or transmitted.
    setRequested(true);
  }

  return (
    <div className="page-content account-page account-export-page">
      <h1>{t('account.export.title')}</h1>
      <p className="account-page-description">{t('account.export.explanation')}</p>

      <div className="account-preview-notice" role="note">
        <p>{t('account.previewNotice')}</p>
      </div>

      <section className="account-section" aria-labelledby="export-ownership-heading">
        <h2 id="export-ownership-heading">{t('account.export.ownershipTitle')}</h2>
        <p>{t('account.export.ownership')}</p>
      </section>

      <section className="account-section" aria-labelledby="export-delivery-heading">
        <h2 id="export-delivery-heading">{t('account.export.deliveryTitle')}</h2>
        <p>{t('account.export.delivery')}</p>
      </section>

      {requested ? (
        <p className="account-success" role="status">
          {t('account.export.requested')}
        </p>
      ) : (
        <>
          <button type="button" className="btn-primary" onClick={handleRequest}>
            {t('account.export.requestButton')}
          </button>
          <p className="account-preview-note">{t('account.export.previewNote')}</p>
        </>
      )}
    </div>
  );
}
