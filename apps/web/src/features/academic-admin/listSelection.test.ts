import { describe, expect, test } from 'vitest';
import { selectionAfterDeleteId } from './listSelection';

describe('selectionAfterDeleteId', () => {
  test('prefers previous sibling, then next, then null', () => {
    const ids = ['a', 'b', 'c'];
    expect(selectionAfterDeleteId(ids, 'b')).toBe('a');
    expect(selectionAfterDeleteId(ids, 'a')).toBe('b');
    expect(selectionAfterDeleteId(ids, 'c')).toBe('b');
    expect(selectionAfterDeleteId(['only'], 'only')).toBeNull();
  });

  test('returns null when id is missing', () => {
    expect(selectionAfterDeleteId(['a', 'b'], 'missing')).toBeNull();
    expect(selectionAfterDeleteId([], 'a')).toBeNull();
  });
});
