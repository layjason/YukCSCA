import { useTranslation } from 'react-i18next';

export function PrivacyPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="privacy-page">
      <h1>{t('public.privacy.title')}</h1>
      <p className="privacy-body">{t('public.privacy.body')}</p>
    </div>
  );
}
