import { ContentBlockView } from '@/features/learn/components/ContentBlockView';
import type { ContentBlock } from '../types';

interface AssessmentBlocksProps {
  blocks: readonly ContentBlock[];
  className?: string;
}

/** Render assessment stems/options/hints using the shared Learn block renderer (TEXT/MATH/IMAGE). */
export function AssessmentBlocks({ blocks, className }: AssessmentBlocksProps): React.JSX.Element {
  return (
    <div className={className ?? 'assessment-blocks'}>
      {blocks.map((block, index) => (
        <ContentBlockView key={`ab-${index}`} block={block} index={index} />
      ))}
    </div>
  );
}
