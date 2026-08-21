import { Bookmark } from 'lucide-react';

interface TermBookmarkIconProps {
  marked: boolean;
  size: number;
}

export function TermBookmarkIcon({ marked, size }: TermBookmarkIconProps): React.JSX.Element {
  return (
    <Bookmark
      className={`term-bookmark-icon${marked ? ' is-marked' : ''}`}
      size={size}
      strokeWidth={2}
      fill={marked ? 'currentColor' : 'none'}
      aria-hidden="true"
    />
  );
}
