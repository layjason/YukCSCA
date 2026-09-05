import type { MathBlockSource } from './types';

export function mathBlocksFrom(
  blocks: readonly { kind: string; latex?: string }[],
): MathBlockSource[] {
  const result: MathBlockSource[] = [];
  blocks.forEach((block, index) => {
    if (block.kind === 'MATH' && typeof block.latex === 'string' && block.latex.length > 0) {
      result.push({ index, latex: block.latex });
    }
  });
  return result;
}
