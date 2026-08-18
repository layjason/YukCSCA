import { TappableText, type TappableSpan } from '@/shared/terminology/TappableText';
import type { ContentBlock } from '../types';
import { LessonImage } from './LessonImage';
import { MathBlock } from './MathBlock';

interface ContentBlockViewProps {
  block: ContentBlock;
  index: number;
  highlighted?: boolean;
  blockRef?: (element: HTMLElement | null) => void;
  termSpans?: readonly TappableSpan[] | undefined;
  onTermActivate?: ((span: TappableSpan) => void) | undefined;
}

export function ContentBlockView({
  block,
  index,
  highlighted = false,
  blockRef,
  termSpans,
  onTermActivate,
}: ContentBlockViewProps): React.JSX.Element {
  const className = [
    'learn-content-block',
    `learn-content-block-${block.kind.toLowerCase()}`,
    highlighted ? 'learn-content-block-resume' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={blockRef} className={className} data-block-index={index} id={`learn-block-${index}`}>
      {block.kind === 'TEXT' ? (
        termSpans && termSpans.length > 0 && onTermActivate ? (
          <TappableText text={block.text} spans={termSpans} onActivate={onTermActivate} />
        ) : (
          <p className="learn-text-block">{block.text}</p>
        )
      ) : null}
      {block.kind === 'MATH' ? (
        <MathBlock latex={block.latex} displayMode={block.displayMode} />
      ) : null}
      {block.kind === 'IMAGE' ? (
        <LessonImage imageId={block.imageId} altText={block.altText} caption={block.caption} />
      ) : null}
    </div>
  );
}
