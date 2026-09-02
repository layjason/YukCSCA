import { expect, test } from 'vitest';
import { mathBlocksFrom } from './mathBlocks';

test('collects authored MATH latex with block indexes', () => {
  expect(
    mathBlocksFrom([
      { kind: 'TEXT' },
      { kind: 'MATH', latex: 'x^2-1' },
      { kind: 'MATH', latex: '' },
    ]),
  ).toEqual([{ index: 1, latex: 'x^2-1' }]);
});
