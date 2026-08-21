import { useEffect, useRef, useMemo, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { splitTextBySpans, type TappableSpan } from '@/shared/terminology/termPresentation';
import { KatexFormula } from './KatexFormula';
import { parseInlineLatex, rangesOverlap, reservedInlineLatexRanges } from './inlineLatex';

const POINTER_HOVER_MS = 400;

function TermChip({
  span,
  text,
  onActivate,
  onHoverEnd,
  disabled,
}: {
  span: TappableSpan;
  text: string;
  onActivate: (span: TappableSpan, target: HTMLElement) => void;
  onHoverEnd?: ((span: TappableSpan) => void) | undefined;
  disabled: boolean;
}): React.JSX.Element {
  const timer = useRef<number>(0);
  const cancelHover = (): void => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className="term-chip"
      lang="zh"
      disabled={disabled}
      onClick={(event) => {
        cancelHover();
        onActivate(span, event.currentTarget);
      }}
      onPointerDown={cancelHover}
      onPointerEnter={(event) => {
        if (disabled || event.pointerType !== 'mouse') return;
        cancelHover();
        const target = event.currentTarget;
        timer.current = window.setTimeout(() => onActivate(span, target), POINTER_HOVER_MS);
      }}
      onPointerLeave={(event) => {
        cancelHover();
        if (event.pointerType === 'mouse') onHoverEnd?.(span);
      }}
    >
      {text}
    </button>
  );
}

interface MixedProseProps {
  text: string;
  as?: ElementType;
  className?: string;
  lang?: string;
  spans?: readonly TappableSpan[] | undefined;
  onActivate?: ((span: TappableSpan, target: HTMLElement) => void) | undefined;
  onHoverEnd?: ((span: TappableSpan) => void) | undefined;
  disabled?: boolean;
}

/** Shared prose renderer: TEXT-like strings may include bounded `\(...\)` inline KaTeX. */
export function MixedProse({
  text,
  as: Tag = 'span',
  className = '',
  lang,
  spans = [],
  onActivate,
  onHoverEnd,
  disabled = false,
}: MixedProseProps): React.JSX.Element {
  const { t } = useTranslation();
  const segments = useMemo(() => parseInlineLatex(text), [text]);
  const usableSpans = useMemo(() => {
    const reserved = reservedInlineLatexRanges(text);
    return spans.filter(
      (span) =>
        !reserved.some((range) =>
          rangesOverlap(span.startOffset, span.endOffset, range.start, range.end),
        ),
    );
  }, [text, spans]);

  return (
    <Tag className={className} lang={lang}>
      {segments.flatMap((segment, index) => {
        if (segment.kind === 'math') {
          const latex = segment.latex;
          return [
            <KatexFormula
              key={`math-${segment.start}-${index}`}
              latex={latex}
              displayMode={false}
              ariaLabel={t('content.inlineMathAria', { latex })}
              errorLabel={t('content.inlineMathError')}
            />,
          ];
        }
        if (segment.kind === 'unmatched') {
          return [
            <span key={`unmatched-${segment.start}`} className="learn-math-error" role="alert">
              {t('content.unmatchedInlineLatex')}
            </span>,
          ];
        }
        const localSpans = usableSpans
          .filter((span) => span.startOffset >= segment.start && span.endOffset <= segment.end)
          .map((span) => ({
            ...span,
            startOffset: span.startOffset - segment.start,
            endOffset: span.endOffset - segment.start,
          }));
        const parts = splitTextBySpans(segment.text, localSpans);
        return parts.map((part, partIndex) =>
          part.span && onActivate ? (
            <TermChip
              key={`${part.span.termId}-${part.span.startOffset}-${index}-${partIndex}`}
              span={part.span}
              text={part.text}
              onActivate={onActivate}
              onHoverEnd={onHoverEnd}
              disabled={disabled}
            />
          ) : (
            <span key={`plain-${index}-${partIndex}`}>{part.text}</span>
          ),
        );
      })}
    </Tag>
  );
}
