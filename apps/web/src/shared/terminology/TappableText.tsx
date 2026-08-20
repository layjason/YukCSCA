import { MixedProse } from '@/shared/content/MixedProse';
import type { TappableSpan } from './termPresentation';

export type { TappableSpan };

interface TappableTextProps {
  text: string;
  spans: readonly TappableSpan[];
  onActivate: (span: TappableSpan) => void;
  disabled?: boolean;
}

export function TappableText({
  text,
  spans,
  onActivate,
  disabled = false,
}: TappableTextProps): React.JSX.Element {
  return (
    <MixedProse
      text={text}
      as="p"
      className="term-tappable-text"
      lang="zh"
      spans={spans}
      onActivate={onActivate}
      disabled={disabled}
    />
  );
}
