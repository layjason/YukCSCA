import { useTranslation } from 'react-i18next';

export function AccountPrivacyPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="page-content account-page account-privacy-page">
      <h1>{t('account.privacy.title')}</h1>
      <p className="account-page-description">{t('account.privacy.body')}</p>

      <div className="account-preview-notice" role="note">
        <p>{t('account.previewNotice')}</p>
      </div>

      <section className="account-section" aria-labelledby="privacy-collected-heading">
        <h2 id="privacy-collected-heading">{t('account.privacy.collectionTitle')}</h2>
        <p>{t('account.privacy.collectionBody')}</p>
      </section>

      <section className="account-section" aria-labelledby="privacy-boundary-heading">
        <h2 id="privacy-boundary-heading">{t('account.privacy.parentBoundaryTitle')}</h2>
        <p>{t('account.privacy.parentBoundary')}</p>
      </section>

      <section className="account-section" aria-labelledby="privacy-minors-heading">
        <h2 id="privacy-minors-heading">{t('account.privacy.minorTitle')}</h2>
        <p>{t('account.privacy.minorNote')}</p>
      </section>
    </div>
  );
}
