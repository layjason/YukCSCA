import { useTranslation } from 'react-i18next';

export function TermsPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="terms-page">
      <h1>{t('public.terms.title')}</h1>
      <p className="terms-body">{t('public.terms.body')}</p>
    </div>
  );
}
