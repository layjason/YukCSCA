import type { ContentProgress, ContentProgressStatus } from './types';

export function clampResumeBlockIndex(
  resumeBlockIndex: number | null | undefined,
  blockCount: number,
): number | null {
  if (resumeBlockIndex == null || blockCount <= 0) return null;
  if (!Number.isFinite(resumeBlockIndex) || resumeBlockIndex < 0) return 0;
  return Math.min(Math.floor(resumeBlockIndex), blockCount - 1);
}

export function progressStatusLabelKey(
  status: ContentProgressStatus,
  updatedSinceCompleted = false,
): string {
  if (status === 'CONTENT_COMPLETE' && updatedSinceCompleted) {
    return 'learn.progress.updated';
  }
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

export function progressChipClass(
  status: ContentProgressStatus,
  updatedSinceCompleted = false,
): string {
  if (status === 'CONTENT_COMPLETE' && updatedSinceCompleted) {
    return 'learn-progress-chip learn-progress-chip-updated';
  }
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

export function isUpdatedSinceCompleted(progress: ContentProgress | null | undefined): boolean {
  return progress?.status === 'CONTENT_COMPLETE' && progress.updatedSinceCompleted === true;
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

export type ResumeProgressSave = (resumeBlockIndex: number) => Promise<void>;

export interface ResumeProgressCoalescer {
  /** Record a farther visible block index; schedules a coalesced save. */
  note(index: number): void;
  /** Seed or restore the last successfully persisted index. */
  setLastSaved(index: number | null): void;
  getLastSaved(): number | null;
  /** Flush any pending index immediately (unmount / language change). */
  flushNow(): Promise<void>;
  dispose(): void;
}

/**
 * Coalesces rapid resume-index advances into fewer IN_PROGRESS PUTs.
 * Keeps the farthest noted index; only saves when it exceeds lastSaved.
 */
export function createResumeProgressCoalescer(options: {
  save: ResumeProgressSave;
  delayMs?: number;
  initialLastSaved?: number | null;
}): ResumeProgressCoalescer {
  const delayMs = options.delayMs ?? 350;
  let lastSaved: number | null =
    options.initialLastSaved === undefined ? null : options.initialLastSaved;
  let pending: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let disposed = false;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(): void {
    if (disposed || timer !== null || inFlight) return;
    timer = setTimeout(() => {
      timer = null;
      void runFlush();
    }, delayMs);
  }

  async function runFlush(): Promise<void> {
    if (disposed || pending === null) return;
    if (lastSaved !== null && pending <= lastSaved) {
      pending = null;
      return;
    }
    const index = pending;
    pending = null;
    inFlight = true;
    try {
      await options.save(index);
      lastSaved = index;
    } catch {
      // Keep lastSaved unchanged so the next note/flush can retry the index.
      if (pending === null || pending < index) {
        pending = index;
      }
    } finally {
      inFlight = false;
      if (!disposed && pending !== null && (lastSaved === null || pending > lastSaved)) {
        schedule();
      }
    }
  }

  return {
    note(index: number): void {
      if (disposed) return;
      if (!Number.isFinite(index) || index < 0) return;
      const floored = Math.floor(index);
      if (lastSaved !== null && floored <= lastSaved) return;
      pending = pending === null ? floored : Math.max(pending, floored);
      schedule();
    },
    setLastSaved(index: number | null): void {
      lastSaved = index;
    },
    getLastSaved(): number | null {
      return lastSaved;
    },
    async flushNow(): Promise<void> {
      clearTimer();
      await runFlush();
    },
    dispose(): void {
      disposed = true;
      clearTimer();
      pending = null;
    },
  };
}
