import { describe, expect, test } from 'vitest';
import type { SyllabusOutlineItem } from './types';
import {
  canDeleteOutlineItem,
  createModule,
  createTopic,
  deleteOutlineItem,
  flattenOutlineForDisplay,
  selectionAfterDelete,
  setOutlineParent,
} from './outlineTree';

function item(
  id: string,
  parentId: string | null,
  order: number,
  section: string,
): SyllabusOutlineItem {
  return {
    id,
    parentId,
    order,
    sourcePosition: { page: 1, section },
    summary: { indonesian: '', english: section, simplifiedChinese: '' },
  };
}

describe('outlineTree', () => {
  test('flattenOutlineForDisplay nests topics under modules by order', () => {
    const items = [
      item('t2', 'm1', 1, '1.2'),
      item('m2', null, 1, '2'),
      item('m1', null, 0, '1'),
      item('t1', 'm1', 0, '1.1'),
    ];
    const rows = flattenOutlineForDisplay(items);
    expect(rows.map((r) => r.item.id)).toEqual(['m1', 't1', 't2', 'm2']);
    expect(rows.map((r) => r.kind)).toEqual(['module', 'topic', 'topic', 'module']);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 0]);
  });

  test('createModule uses parentId null and sibling order', () => {
    const existing = [item('m1', null, 0, '1')];
    const created = createModule(existing);
    expect(created.parentId).toBeNull();
    expect(created.order).toBe(1);
  });

  test('createTopic requires a root module parent', () => {
    const items = [item('m1', null, 0, '1'), item('t1', 'm1', 0, '1.1')];
    expect(createTopic(items, 't1')).toBeNull();
    const topic = createTopic(items, 'm1');
    expect(topic?.parentId).toBe('m1');
    expect(topic?.order).toBe(1);
  });

  test('delete blocks modules that still have topics', () => {
    const items = [item('m1', null, 0, '1'), item('t1', 'm1', 0, '1.1')];
    expect(canDeleteOutlineItem(items, 'm1')).toEqual({ ok: false, reason: 'hasChildren' });
    expect(deleteOutlineItem(items, 'm1')).toBeNull();
  });

  test('delete leaf reindexes remaining siblings', () => {
    const items = [
      item('m1', null, 0, '1'),
      item('t1', 'm1', 0, '1.1'),
      item('t2', 'm1', 1, '1.2'),
    ];
    const next = deleteOutlineItem(items, 't1');
    expect(next?.map((i) => i.id).sort()).toEqual(['m1', 't2']);
    expect(next?.find((i) => i.id === 't2')?.order).toBe(0);
  });

  test('setOutlineParent moves a topic under another module', () => {
    const items = [item('m1', null, 0, '1'), item('m2', null, 1, '2'), item('t1', 'm1', 0, '1.1')];
    const next = setOutlineParent(items, 't1', 'm2');
    expect(next?.find((i) => i.id === 't1')?.parentId).toBe('m2');
  });

  test('setOutlineParent refuses to nest under a topic or promote a module with children', () => {
    const items = [
      item('m1', null, 0, '1'),
      item('t1', 'm1', 0, '1.1'),
      item('t2', 'm1', 1, '1.2'),
    ];
    expect(setOutlineParent(items, 't2', 't1')).toBeNull();
    expect(setOutlineParent(items, 'm1', 'm1')).toBeNull();
  });

  test('selectionAfterDelete prefers topic above, then below, then module', () => {
    const items = [
      item('m1', null, 0, '1'),
      item('t1', 'm1', 0, '1.1'),
      item('t2', 'm1', 1, '1.2'),
      item('t3', 'm1', 2, '1.3'),
    ];
    expect(selectionAfterDelete(items, 't2')).toBe('t1'); // above
    expect(selectionAfterDelete(items, 't1')).toBe('t2'); // no above → below
    expect(selectionAfterDelete([item('m1', null, 0, '1'), item('t1', 'm1', 0, '1.1')], 't1')).toBe(
      'm1',
    ); // only topic → module
  });

  test('selectionAfterDelete for modules prefers neighbor module', () => {
    const items = [item('m1', null, 0, '1'), item('m2', null, 1, '2'), item('m3', null, 2, '3')];
    expect(selectionAfterDelete(items, 'm2')).toBe('m1');
    expect(selectionAfterDelete(items, 'm1')).toBe('m2');
    expect(selectionAfterDelete([item('m1', null, 0, '1')], 'm1')).toBeNull();
  });
});
