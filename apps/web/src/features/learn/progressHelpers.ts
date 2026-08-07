import type { ContentProgress, ContentProgressStatus } from './types';

export function clampResumeBlockIndex(
  resumeBlockIndex: number | null | undefined,
  blockCount: number,
): number | null {
  if (resumeBlockIndex == null || blockCount <= 0) return null;
  if (!Number.isFinite(resumeBlockIndex) || resumeBlockIndex < 0) return 0;
  return Math.min(Math.floor(resumeBlockIndex), blockCount - 1);
}

export function progressStatusLabelKey(status: ContentProgressStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'learn.progress.inProgress';
    case 'CONTENT_COMPLETE':
      return 'learn.progress.contentComplete';
    case 'NOT_STARTED':
    default:
      return 'learn.progress.notStarted';
  }
}

export function progressChipClass(status: ContentProgressStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'learn-progress-chip learn-progress-chip-in-progress';
    case 'CONTENT_COMPLETE':
      return 'learn-progress-chip learn-progress-chip-complete';
    case 'NOT_STARTED':
    default:
      return 'learn-progress-chip learn-progress-chip-not-started';
  }
}

export function isContentComplete(progress: ContentProgress | null | undefined): boolean {
  return progress?.status === 'CONTENT_COMPLETE';
}

export function coverageLabelKey(
  coverage: 'FULLY_COVERED' | 'PARTIALLY_COVERED' | 'NOT_COVERED',
): string {
  switch (coverage) {
    case 'FULLY_COVERED':
      return 'learn.coverage.fullyCovered';
    case 'PARTIALLY_COVERED':
      return 'learn.coverage.partiallyCovered';
    case 'NOT_COVERED':
    default:
      return 'learn.coverage.notCovered';
  }
}
