import { useTranslation } from 'react-i18next';
import { progressChipClass, progressStatusLabelKey } from '../progressHelpers';
import type { ContentProgress, ContentProgressStatus } from '../types';

interface ContentProgressChipProps {
  status: ContentProgressStatus;
  updatedSinceCompleted?: boolean;
  className?: string;
}

export function ContentProgressChip({
  status,
  updatedSinceCompleted = false,
  className = '',
}: ContentProgressChipProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <span className={`${progressChipClass(status, updatedSinceCompleted)} ${className}`.trim()}>
      {t(progressStatusLabelKey(status, updatedSinceCompleted))}
    </span>
  );
}

interface ContentProgressFromProps {
  progress: ContentProgress;
  className?: string;
}

/** Convenience wrapper that reads status + soft-update flag from a progress projection. */
export function ContentProgressFrom({
  progress,
  className,
}: ContentProgressFromProps): React.JSX.Element {
  return (
    <ContentProgressChip
      status={progress.status}
      updatedSinceCompleted={progress.updatedSinceCompleted}
      className={className ?? ''}
    />
  );
}
