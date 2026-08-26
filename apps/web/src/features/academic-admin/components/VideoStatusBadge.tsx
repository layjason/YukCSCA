import { useTranslation } from 'react-i18next';
import type { VideoAssetStatus } from '../types';

interface VideoStatusBadgeProps {
  status: VideoAssetStatus;
}

export function VideoStatusBadge({ status }: VideoStatusBadgeProps): React.JSX.Element {
  const { t } = useTranslation();

  let tagClass = 'admin-tag-compact ';
  switch (status) {
    case 'REVIEWED':
      tagClass += 'yukcsca-tag-success';
      break;
    case 'REJECTED':
      tagClass += 'yukcsca-tag-danger';
      break;
    case 'AWAITING_VALIDATION':
      tagClass += 'yukcsca-tag-warning';
      break;
    case 'DRAFT':
      tagClass += 'yukcsca-tag-info';
      break;
    case 'RETIRED':
    default:
      tagClass += 'yukcsca-tag-neutral';
      break;
  }

  return (
    <span className={`yukcsca-tag ${tagClass}`} role="status">
      {t(`admin.academic.video.status.${status}`)}
    </span>
  );
}
