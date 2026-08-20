import { ContentBlockView } from '@/features/learn/components/ContentBlockView';
import type { TappableSpan } from '@/shared/terminology/TappableText';
import type { ContentBlock } from '../types';

export interface AssessmentTermSpan extends TappableSpan {
  blockIndex: number;
}

interface AssessmentBlocksProps {
  blocks: readonly ContentBlock[];
  className?: string;
  /** List previews split copy/media and clip overflow instead of scaling. */
  preview?: boolean;
  termSpans?: readonly AssessmentTermSpan[] | undefined;
  onTermActivate?: ((span: TappableSpan) => void) | undefined;
  termDisabled?: boolean | undefined;
}

function renderBlock(
  block: ContentBlock,
  index: number,
  preview: boolean,
  termSpans: readonly AssessmentTermSpan[] | undefined,
  onTermActivate: ((span: TappableSpan) => void) | undefined,
  termDisabled: boolean,
): React.JSX.Element {
  const spans = termSpans
    ?.filter((span) => span.blockIndex === index)
    .map((span) => ({
      termId: span.termId,
      surfaceForm: span.surfaceForm,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
    }));
  const view = (
    <ContentBlockView
      key={`ab-${index}`}
      block={block}
      index={index}
      termSpans={spans}
      onTermActivate={onTermActivate}
      termDisabled={termDisabled}
    />
  );
  if (preview && block.kind === 'IMAGE') {
    return (
      <div key={`ab-${index}`} className="mistakes-preview-image">
        {view}
      </div>
    );
  }
  return view;
}

/** Render assessment stems/options/hints using the shared Learn block renderer (TEXT/MATH/IMAGE). */
export function AssessmentBlocks({
  blocks,
  className,
  preview = false,
  termSpans,
  onTermActivate,
  termDisabled = false,
}: AssessmentBlocksProps): React.JSX.Element {
  if (!preview) {
    return (
      <div className={className ?? 'assessment-blocks'}>
        {blocks.map((block, index) =>
          renderBlock(block, index, false, termSpans, onTermActivate, termDisabled),
        )}
      </div>
    );
  }

  const copy = blocks
    .map((block, index) => ({ block, index }))
    .filter((row) => row.block.kind !== 'IMAGE');
  const media = blocks
    .map((block, index) => ({ block, index }))
    .filter((row) => row.block.kind === 'IMAGE');

  return (
    <div
      className={[
        className ?? 'assessment-blocks',
        'mistakes-preview-blocks',
        media.length > 0 ? 'has-image' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {copy.length > 0 ? (
        <div className="mistakes-preview-copy">
          {copy.map(({ block, index }) =>
            renderBlock(block, index, true, termSpans, onTermActivate, termDisabled),
          )}
        </div>
      ) : null}
      {media.length > 0 ? (
        <div className="mistakes-preview-media">
          {media.map(({ block, index }) =>
            renderBlock(block, index, true, termSpans, onTermActivate, termDisabled),
          )}
        </div>
      ) : null}
    </div>
  );
}
