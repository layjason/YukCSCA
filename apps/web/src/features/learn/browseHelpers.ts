import type { LessonSummary, SyllabusOutlineNode } from './types';

/** True when the student has not finished this lesson (or soft-update needs review). */
export function isLessonIncomplete(lesson: LessonSummary): boolean {
  const progress = lesson.contentProgress;
  if (progress.status === 'CONTENT_COMPLETE' && !progress.updatedSinceCompleted) {
    return false;
  }
  return true;
}

/**
 * First incomplete LESSON in outline order (module/topic order, then lesson list order).
 * Used for “Start reading” when there is no server continue target (no IN_PROGRESS).
 */
export function findFirstIncompleteLesson(outline: SyllabusOutlineNode[]): LessonSummary | null {
  const roots = outline.filter((node) => node.parentId == null).sort((a, b) => a.order - b.order);

  function walk(nodes: SyllabusOutlineNode[]): LessonSummary | null {
    const sorted = [...nodes].sort((a, b) => a.order - b.order);
    for (const node of sorted) {
      for (const lesson of node.lessons) {
        if (isLessonIncomplete(lesson)) return lesson;
      }
      const children = outline.filter((child) => child.parentId === node.id);
      const found = walk(children);
      if (found) return found;
    }
    return null;
  }

  // Prefer walking from roots so parent/child order is respected.
  const fromRoots = walk(roots);
  if (fromRoots) return fromRoots;

  // Orphan nodes (parent missing from payload) still contribute in order.
  const orphans = outline
    .filter((node) => node.parentId != null && !outline.some((p) => p.id === node.parentId))
    .sort((a, b) => a.order - b.order);
  return walk(orphans);
}
