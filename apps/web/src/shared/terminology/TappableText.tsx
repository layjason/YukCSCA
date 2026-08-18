import { splitTextBySpans } from './termPresentation';

export interface TappableSpan {
  termId: string;
  surfaceForm: string;
  startOffset: number;
  endOffset: number;
}

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
  const parts = splitTextBySpans(text, spans);
  return (
    <p className="term-tappable-text" lang="zh">
      {parts.map((part, index) =>
        part.span ? (
          <button
            key={`${part.span.termId}-${part.span.startOffset}-${index}`}
            type="button"
            className="term-chip"
            disabled={disabled}
            onClick={() => onActivate(part.span!)}
          >
            {part.text}
          </button>
        ) : (
          <span key={`plain-${index}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}
