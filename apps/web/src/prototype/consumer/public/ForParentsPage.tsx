import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ForParentsPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="for-parents-page">
      <header className="for-parents-header">
        <h1>{t('public.forParents.title')}</h1>
        <p className="for-parents-subtitle">{t('public.forParents.subtitle')}</p>
      </header>

      <section className="for-parents-summary" aria-labelledby="for-parents-summary-heading">
        <h2 id="for-parents-summary-heading">{t('public.forParents.summaryTitle')}</h2>
        <ul className="for-parents-list">
          <li>{t('public.forParents.summaryItem1')}</li>
          <li>{t('public.forParents.summaryItem2')}</li>
          <li>{t('public.forParents.summaryItem3')}</li>
          <li>{t('public.forParents.summaryItem4')}</li>
          <li>{t('public.forParents.summaryItem5')}</li>
        </ul>
      </section>

      <section className="for-parents-privacy" aria-labelledby="for-parents-privacy-heading">
        <h2 id="for-parents-privacy-heading">{t('public.forParents.privacyTitle')}</h2>
        <ul className="for-parents-list">
          <li>{t('public.forParents.privacyItem1')}</li>
          <li>{t('public.forParents.privacyItem2')}</li>
          <li>{t('public.forParents.privacyItem3')}</li>
          <li>{t('public.forParents.privacyItem4')}</li>
        </ul>
        <p className="for-parents-privacy-note">{t('public.forParents.privacyNote')}</p>
      </section>

      <div className="for-parents-actions">
        <Link to="/register" className="btn-primary">
          {t('public.forParents.cta')}
        </Link>
      </div>
    </div>
  );
}
