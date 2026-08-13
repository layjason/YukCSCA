import { ContentBlockView } from '@/features/learn/components/ContentBlockView';
import type { ContentBlock } from '../types';

interface AssessmentBlocksProps {
  blocks: readonly ContentBlock[];
  className?: string;
  /** List previews split copy/media and clip overflow instead of scaling. */
  preview?: boolean;
}

function renderBlock(block: ContentBlock, index: number, preview: boolean): React.JSX.Element {
  if (preview && block.kind === 'IMAGE') {
    return (
      <div key={`ab-${index}`} className="mistakes-preview-image">
        <ContentBlockView block={block} index={index} />
      </div>
    );
  }
  return <ContentBlockView key={`ab-${index}`} block={block} index={index} />;
}

/** Render assessment stems/options/hints using the shared Learn block renderer (TEXT/MATH/IMAGE). */
export function AssessmentBlocks({
  blocks,
  className,
  preview = false,
}: AssessmentBlocksProps): React.JSX.Element {
  if (!preview) {
    return (
      <div className={className ?? 'assessment-blocks'}>
        {blocks.map((block, index) => renderBlock(block, index, false))}
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
          {copy.map(({ block, index }) => renderBlock(block, index, true))}
        </div>
      ) : null}
      {media.length > 0 ? (
        <div className="mistakes-preview-media">
          {media.map(({ block, index }) => renderBlock(block, index, true))}
        </div>
      ) : null}
    </div>
  );
}
