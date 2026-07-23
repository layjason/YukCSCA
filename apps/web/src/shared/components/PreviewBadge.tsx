import { useTranslation } from 'react-i18next';

export function PreviewBadge(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="preview-badge" aria-label={t('preview.badgeAria')}>
      {t('preview.badge')}
    </span>
  );
}
