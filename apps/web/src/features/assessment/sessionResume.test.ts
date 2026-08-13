import { expect, test } from 'vitest';
import { ApiError } from '@/shared/api/httpClient';
import {
  matchingInProgressForSet,
  matchingInProgressSession,
  startReplacingInProgressSession,
} from './sessionResume';
import type { AssessmentSessionResumeSummary } from './types';

function resume(
  overrides: Partial<AssessmentSessionResumeSummary> = {},
): AssessmentSessionResumeSummary {
  return {
    sessionId: 's1',
    status: 'IN_PROGRESS',
    purpose: 'TOPIC_PRACTICE',
    subject: 'MATHEMATICS',
    packageId: 'p1',
    packageRevisionId: 'r1',
    setId: 'set-1',
    mistakeId: null,
    lessonResourceId: null,
    title: { english: 'Practice' },
    examLanguage: 'en',
    feedbackMode: 'IMMEDIATE',
    questionCount: 4,
    answeredItemCount: 1,
    lockedItemCount: 1,
    updatedAt: '2026-08-12T00:00:00Z',
    ...overrides,
  };
}

test('matchingInProgressSession requires purpose and optional identity fields', () => {
  const rows = [
    resume({ sessionId: 'a', purpose: 'CHECKPOINT', setId: 'cp', lessonResourceId: 'lesson' }),
    resume({ sessionId: 'b', purpose: 'TOPIC_PRACTICE', setId: 'set-1', examLanguage: 'zh-CN' }),
    resume({ sessionId: 'c', purpose: 'REVALIDATION', setId: null, mistakeId: 'm1' }),
  ];

  expect(
    matchingInProgressSession(rows, {
      purpose: 'CHECKPOINT',
      setId: 'cp',
      examLanguage: 'en',
      lessonResourceId: 'lesson',
    })?.sessionId,
  ).toBe('a');
  expect(matchingInProgressForSet(rows, 'set-1', 'zh-CN')?.sessionId).toBe('b');
  expect(
    matchingInProgressSession(rows, { purpose: 'REVALIDATION', mistakeId: 'm1' })?.sessionId,
  ).toBe('c');
  expect(matchingInProgressForSet(rows, 'set-1', 'en')).toBeUndefined();
});

test('matchingInProgressSession ignores submitted rows', () => {
  expect(
    matchingInProgressSession([resume({ status: 'SUBMITTED' })], {
      purpose: 'TOPIC_PRACTICE',
      setId: 'set-1',
      examLanguage: 'en',
    }),
  ).toBeUndefined();
});

test('startReplacingInProgressSession aborts start when cancel fails', async () => {
  const start = async () => ({ sessionId: 'new' });
  const result = await startReplacingInProgressSession({
    existingSessionId: 'old',
    cancel: async () => {
      throw new ApiError(500, { title: 'network' });
    },
    start,
  });
  expect(result).toEqual({ ok: false, reason: 'CANCEL_FAILED' });
});

test('startReplacingInProgressSession treats cancel 404 as already gone', async () => {
  const result = await startReplacingInProgressSession({
    existingSessionId: 'old',
    cancel: async () => {
      throw new ApiError(404, { title: 'missing' });
    },
    start: async () => ({ sessionId: 'new' }),
  });
  expect(result).toEqual({ ok: true, session: { sessionId: 'new' } });
});

test('startReplacingInProgressSession rejects a start that resumed the old row', async () => {
  const result = await startReplacingInProgressSession({
    existingSessionId: 'old',
    cancel: async () => undefined,
    start: async () => ({ sessionId: 'old' }),
  });
  expect(result).toEqual({ ok: false, reason: 'STILL_RESUMED' });
});
