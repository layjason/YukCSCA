/**
 * After deleting an item from an ordered flat list, pick the next selection.
 *
 * Precedence (aligned with syllabus outline sibling behavior):
 * 1. previous sibling
 * 2. next sibling
 * 3. null when the list becomes empty / deleted id was not found
 */
export function selectionAfterDeleteId(
  orderedIds: readonly string[],
  deletedId: string,
): string | null {
  const index = orderedIds.indexOf(deletedId);
  if (index < 0) return null;
  if (index > 0) {
    return orderedIds[index - 1] ?? null;
  }
  if (index < orderedIds.length - 1) {
    return orderedIds[index + 1] ?? null;
  }
  return null;
}
