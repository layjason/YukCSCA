import { selectionAfterDeleteId } from './listSelection';
import type { SyllabusOutlineItem } from './types';

export type OutlineDisplayRow = {
  item: SyllabusOutlineItem;
  /** 0 = module (root), 1 = topic (child). */
  depth: 0 | 1;
  kind: 'module' | 'topic' | 'orphan';
};

function emptySummary(): SyllabusOutlineItem['summary'] {
  return { indonesian: '', english: '', simplifiedChinese: '' };
}

function byOrder(a: SyllabusOutlineItem, b: SyllabusOutlineItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

export function isRootModule(item: SyllabusOutlineItem): boolean {
  return item.parentId == null;
}

export function modulesOf(items: SyllabusOutlineItem[]): SyllabusOutlineItem[] {
  return items.filter(isRootModule).slice().sort(byOrder);
}

export function childrenOf(items: SyllabusOutlineItem[], parentId: string): SyllabusOutlineItem[] {
  return items
    .filter((item) => item.parentId === parentId)
    .slice()
    .sort(byOrder);
}

export function childCount(items: SyllabusOutlineItem[], parentId: string): number {
  return items.filter((item) => item.parentId === parentId).length;
}

/**
 * Stable display order: each module, then its topics; orphans last.
 * Supports the planned two-level CSCA module → topic tree.
 */
export function flattenOutlineForDisplay(items: SyllabusOutlineItem[]): OutlineDisplayRow[] {
  const rows: OutlineDisplayRow[] = [];
  const seen = new Set<string>();

  for (const module of modulesOf(items)) {
    rows.push({ item: module, depth: 0, kind: 'module' });
    seen.add(module.id);
    for (const topic of childrenOf(items, module.id)) {
      rows.push({ item: topic, depth: 1, kind: 'topic' });
      seen.add(topic.id);
    }
  }

  for (const item of items) {
    if (seen.has(item.id)) continue;
    // parentId points at a missing/non-root parent — surface as orphan for repair.
    rows.push({ item, depth: 0, kind: 'orphan' });
  }

  return rows;
}

export function nextSiblingOrder(items: SyllabusOutlineItem[], parentId: string | null): number {
  const siblings = parentId == null ? modulesOf(items) : childrenOf(items, parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((s) => s.order ?? 0)) + 1;
}

export function createModule(items: SyllabusOutlineItem[]): SyllabusOutlineItem {
  const order = nextSiblingOrder(items, null);
  return {
    id: crypto.randomUUID(),
    parentId: null,
    order,
    sourcePosition: { page: 1, section: `${order + 1}` },
    summary: emptySummary(),
  };
}

export function createTopic(
  items: SyllabusOutlineItem[],
  parentId: string,
): SyllabusOutlineItem | null {
  const parent = items.find((item) => item.id === parentId);
  if (!parent || !isRootModule(parent)) return null;

  const order = nextSiblingOrder(items, parentId);
  const parentSection = parent.sourcePosition?.section?.trim() || '1';
  return {
    id: crypto.randomUUID(),
    parentId,
    order,
    sourcePosition: {
      page: parent.sourcePosition?.page ?? 1,
      section: `${parentSection}.${order + 1}`,
    },
    summary: emptySummary(),
  };
}

export type OutlineDeleteBlockReason = 'hasChildren';

export function canDeleteOutlineItem(
  items: SyllabusOutlineItem[],
  id: string,
): { ok: true } | { ok: false; reason: OutlineDeleteBlockReason } {
  if (childCount(items, id) > 0) {
    return { ok: false, reason: 'hasChildren' };
  }
  return { ok: true };
}

/** Remove a leaf item and reindex sibling orders within the same parent. */
export function deleteOutlineItem(
  items: SyllabusOutlineItem[],
  id: string,
): SyllabusOutlineItem[] | null {
  if (!canDeleteOutlineItem(items, id).ok) return null;
  const target = items.find((item) => item.id === id);
  if (!target) return null;

  const remaining = items.filter((item) => item.id !== id);
  return reindexSiblingOrders(remaining, target.parentId ?? null);
}

/**
 * After deleting an outline row, pick the next selection.
 *
 * Flat sibling lists use the same precedence as other VS-005 list editors
 * ({@link selectionAfterDeleteId}: previous, else next).
 * For a topic with no remaining siblings, fall back to its module parent.
 * For a leaf module with no neighbors, selection clears.
 */
export function selectionAfterDelete(
  itemsBeforeDelete: SyllabusOutlineItem[],
  deletedId: string,
): string | null {
  const deleted = itemsBeforeDelete.find((item) => item.id === deletedId);
  if (!deleted) return null;

  if (deleted.parentId != null) {
    const siblingIds = childrenOf(itemsBeforeDelete, deleted.parentId).map((item) => item.id);
    return selectionAfterDeleteId(siblingIds, deletedId) ?? deleted.parentId;
  }

  const rootIds = modulesOf(itemsBeforeDelete).map((item) => item.id);
  return selectionAfterDeleteId(rootIds, deletedId);
}

/**
 * Reassign dense 0..n-1 orders among siblings of one parent (or roots when parentId is null).
 * Other items are left unchanged.
 */
export function reindexSiblingOrders(
  items: SyllabusOutlineItem[],
  parentId: string | null,
): SyllabusOutlineItem[] {
  const siblings =
    parentId == null
      ? items.filter(isRootModule).slice().sort(byOrder)
      : items
          .filter((item) => item.parentId === parentId)
          .slice()
          .sort(byOrder);

  const orderById = new Map(siblings.map((item, index) => [item.id, index]));

  return items.map((item) => {
    const nextOrder = orderById.get(item.id);
    if (nextOrder === undefined) return item;
    return nextOrder === item.order ? item : { ...item, order: nextOrder };
  });
}

/**
 * Move item under a new parent (null = module). Topics may only hang under modules.
 * Modules with children cannot become topics.
 */
export function setOutlineParent(
  items: SyllabusOutlineItem[],
  itemId: string,
  nextParentId: string | null,
): SyllabusOutlineItem[] | null {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return null;
  if (nextParentId === itemId) return null;

  if (nextParentId != null) {
    const parent = items.find((entry) => entry.id === nextParentId);
    if (!parent || !isRootModule(parent)) return null;
    if (childCount(items, itemId) > 0) return null;
  }

  if ((item.parentId ?? null) === nextParentId) return items;

  const previousParentId = item.parentId ?? null;
  const moved: SyllabusOutlineItem = {
    ...item,
    parentId: nextParentId,
    order: nextSiblingOrder(
      items.filter((entry) => entry.id !== itemId),
      nextParentId,
    ),
  };

  let next = items.map((entry) => (entry.id === itemId ? moved : entry));
  next = reindexSiblingOrders(next, previousParentId);
  next = reindexSiblingOrders(next, nextParentId);
  return next;
}

export function outlineItemLabel(item: SyllabusOutlineItem, fallback: string): string {
  return (
    item.summary.english ||
    item.summary.indonesian ||
    item.summary.simplifiedChinese ||
    item.sourcePosition?.section ||
    fallback
  );
}
