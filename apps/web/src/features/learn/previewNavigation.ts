import type { LessonSummary } from './types';

export function shouldOfferTerminologyPreview(
  preview: LessonSummary['terminologyPreview'],
): boolean {
  if (!preview) return false;
  return preview.progress.status === 'NOT_STARTED' || preview.progress.status === 'IN_PROGRESS';
}

export function lessonEntryHref(subject: string, lesson: LessonSummary): string {
  if (shouldOfferTerminologyPreview(lesson.terminologyPreview) && lesson.terminologyPreview) {
    const previewId = lesson.terminologyPreview.resourceId;
    return `/app/learn/${subject}/terminology/${previewId}`;
  }
  return `/app/learn/${subject}/lessons/${lesson.resourceId}`;
}

export function previewHref(
  subject: string,
  previewResourceId: string,
  lessonResourceId?: string | null,
): string {
  if (!lessonResourceId) {
    return `/app/learn/${subject}/terminology/${previewResourceId}`;
  }
  return `/app/learn/${subject}/terminology/${previewResourceId}?lessonResourceId=${encodeURIComponent(lessonResourceId)}`;
}

export function lessonHref(subject: string, lessonResourceId: string): string {
  return `/app/learn/${subject}/lessons/${lessonResourceId}`;
}
