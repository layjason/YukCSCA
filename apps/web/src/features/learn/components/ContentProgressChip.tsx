import { useTranslation } from 'react-i18next';
import { progressChipClass, progressStatusLabelKey } from '../progressHelpers';
import type { ContentProgressStatus } from '../types';

interface ContentProgressChipProps {
  status: ContentProgressStatus;
  className?: string;
}

export function ContentProgressChip({
  status,
  className = '',
}: ContentProgressChipProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <span className={`${progressChipClass(status)} ${className}`.trim()}>
      {t(progressStatusLabelKey(status))}
    </span>
  );
}
