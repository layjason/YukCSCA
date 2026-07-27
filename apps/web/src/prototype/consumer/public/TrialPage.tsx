import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function TrialPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="trial-page">
      <header className="trial-page-header">
        <h1>{t('public.trial.title')}</h1>
        <p className="trial-page-subtitle">{t('public.trial.subtitle')}</p>
      </header>

      <section className="trial-included" aria-labelledby="trial-included-heading">
        <h2 id="trial-included-heading">{t('public.trial.included')}</h2>
        <ul className="trial-list">
          <li>{t('public.trial.includedItem1')}</li>
          <li>{t('public.trial.includedItem2')}</li>
          <li>{t('public.trial.includedItem3')}</li>
        </ul>
      </section>

      <section className="trial-not-included" aria-labelledby="trial-not-included-heading">
        <h2 id="trial-not-included-heading">{t('public.trial.notIncluded')}</h2>
        <ul className="trial-list">
          <li>{t('public.trial.notIncludedItem1')}</li>
          <li>{t('public.trial.notIncludedItem2')}</li>
          <li>{t('public.trial.notIncludedItem3')}</li>
          <li>{t('public.trial.notIncludedItem4')}</li>
        </ul>
      </section>

      <p className="trial-preview-notice" role="note">
        {t('public.trial.previewNotice')}
      </p>

      <div className="trial-actions">
        <Link to="/register" className="btn-primary">
          {t('public.trial.cta')}
        </Link>
      </div>
    </div>
  );
}
