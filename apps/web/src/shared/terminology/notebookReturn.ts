export const NOTEBOOK_LIST_PATH = '/app/learn/terms';

export type NotebookNavState = {
  notebookReturnTo?: string;
};

export function isSafeAppPath(path: string): boolean {
  if (!path.startsWith('/app/')) return false;
  if (path.startsWith('//') || path.includes('://')) return false;
  return true;
}

export function notebookStateFrom(
  fromPath: string,
  existing?: unknown,
): NotebookNavState | undefined {
  if (fromPath.startsWith(NOTEBOOK_LIST_PATH)) {
    if (existing && typeof existing === 'object' && 'notebookReturnTo' in existing) {
      const value = (existing as NotebookNavState).notebookReturnTo;
      if (typeof value === 'string' && isSafeAppPath(value)) {
        return { notebookReturnTo: value };
      }
    }
    return undefined;
  }
  if (!isSafeAppPath(fromPath)) return undefined;
  return { notebookReturnTo: fromPath };
}

export function notebookReturnTo(state: unknown, fallback = '/app/learn'): string {
  if (state && typeof state === 'object' && 'notebookReturnTo' in state) {
    const value = (state as NotebookNavState).notebookReturnTo;
    if (
      typeof value === 'string' &&
      isSafeAppPath(value) &&
      !value.startsWith(NOTEBOOK_LIST_PATH)
    ) {
      return value;
    }
  }
  return fallback;
}

export function notebookBackLabelKey(href: string): string {
  if (href.includes('/practice/mistakes')) return 'assessment.mistakes.backToList';
  if (href.includes('/practice') || href.includes('/sessions')) {
    return 'assessment.backToPractice';
  }
  if (href.includes('/lessons/')) return 'assessment.backToLesson';
  if (href.includes('/terminology/')) return 'learn.backToBrowse';
  if (href === '/app/learn' || href.startsWith('/app/learn?')) return 'learn.backToLearn';
  return 'terminology.backToPrevious';
}
