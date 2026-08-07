import { expect, test } from 'vitest';
import { clampResumeBlockIndex, progressStatusLabelKey } from './progressHelpers';

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
  expect(progressStatusLabelKey('CONTENT_COMPLETE')).not.toContain('master');
});
