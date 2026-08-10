import { afterEach, expect, test, vi } from 'vitest';
import {
  clampResumeBlockIndex,
  createResumeProgressCoalescer,
  progressStatusLabelKey,
} from './progressHelpers';

afterEach(() => {
  vi.useRealTimers();
});

test('clampResumeBlockIndex clamps to valid range', () => {
  expect(clampResumeBlockIndex(null, 5)).toBeNull();
  expect(clampResumeBlockIndex(0, 5)).toBe(0);
  expect(clampResumeBlockIndex(4, 5)).toBe(4);
  expect(clampResumeBlockIndex(9, 5)).toBe(4);
  expect(clampResumeBlockIndex(-1, 5)).toBe(0);
  expect(clampResumeBlockIndex(2, 0)).toBeNull();
});

test('progress labels never use mastery vocabulary keys', () => {
  expect(progressStatusLabelKey('NOT_STARTED')).toBe('learn.progress.notStarted');
  expect(progressStatusLabelKey('IN_PROGRESS')).toBe('learn.progress.inProgress');
  expect(progressStatusLabelKey('CONTENT_COMPLETE')).toBe('learn.progress.contentComplete');
  expect(progressStatusLabelKey('CONTENT_COMPLETE', true)).toBe('learn.progress.updated');
  expect(progressStatusLabelKey('CONTENT_COMPLETE')).not.toContain('master');
});

test('createResumeProgressCoalescer coalesces rapid resume advances into one trailing PUT', async () => {
  vi.useFakeTimers();
  const saves: number[] = [];
  const coalescer = createResumeProgressCoalescer({
    delayMs: 100,
    initialLastSaved: 0,
    save: async (index) => {
      saves.push(index);
    },
  });

  coalescer.note(1);
  coalescer.note(2);
  coalescer.note(3);
  coalescer.note(4);
  expect(saves).toEqual([]);

  await vi.advanceTimersByTimeAsync(100);
  expect(saves).toEqual([4]);
  expect(saves.length).toBeLessThan(4);

  coalescer.note(5);
  coalescer.note(6);
  await vi.advanceTimersByTimeAsync(100);
  expect(saves).toEqual([4, 6]);

  coalescer.dispose();
});

test('createResumeProgressCoalescer ignores indexes at or below last saved', async () => {
  vi.useFakeTimers();
  const saves: number[] = [];
  const coalescer = createResumeProgressCoalescer({
    delayMs: 50,
    initialLastSaved: 3,
    save: async (index) => {
      saves.push(index);
    },
  });

  coalescer.note(1);
  coalescer.note(3);
  await vi.advanceTimersByTimeAsync(50);
  expect(saves).toEqual([]);

  coalescer.note(4);
  await vi.advanceTimersByTimeAsync(50);
  expect(saves).toEqual([4]);
  coalescer.dispose();
});
