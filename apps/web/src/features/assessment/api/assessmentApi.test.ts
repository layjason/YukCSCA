import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/httpClient';
import {
  __setAssessmentEnvForTests,
  getCheckpointForLesson,
  listAssessmentSets,
  shouldUseAssessmentDevFallback,
  startAssessmentSession,
} from './assessmentApi';
import { __resetAssessmentDevFallback, DEV_IDS } from './assessmentDevFallback';
import type { CheckpointForLesson } from '../types';

const checkpoint: CheckpointForLesson = {
  subject: 'MATHEMATICS',
  packageId: DEV_IDS.PACKAGE_ID,
  packageRevisionId: DEV_IDS.REVISION_ID,
  lessonResourceId: DEV_IDS.LESSON_ID,
  lessonContentComplete: true,
  startable: true,
  lockReason: null,
  checkpointUpdatedSinceLastAttempt: false,
  editions: [
    {
      setId: DEV_IDS.SET_CHECKPOINT,
      examLanguage: 'en',
      title: { english: 'CP', indonesian: 'CP', simplifiedChinese: 'CP' },
      questionCount: 2,
      estimatedMinutes: 10,
      feedbackMode: 'IMMEDIATE',
      passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
    },
  ],
};

afterEach(() => {
  clearAccessToken();
  __setAssessmentEnvForTests(null);
  __resetAssessmentDevFallback();
  vi.unstubAllGlobals();
});

test('shouldUseAssessmentDevFallback allows offline and 401 in DEV only', () => {
  expect(
    shouldUseAssessmentDevFallback(new TypeError('offline'), undefined, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(true);
  expect(
    shouldUseAssessmentDevFallback(new ApiError(401, { title: 'unauth' }), 401, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(true);
  expect(
    shouldUseAssessmentDevFallback(new ApiError(404, { title: 'missing' }), 404, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(false);
  expect(
    shouldUseAssessmentDevFallback(new ApiError(403, { title: 'forbid' }), 403, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(false);
  expect(
    shouldUseAssessmentDevFallback(new TypeError('offline'), undefined, {
      DEV: false,
      MODE: 'production',
    }),
  ).toBe(false);
  expect(
    shouldUseAssessmentDevFallback(new TypeError('offline'), undefined, {
      DEV: true,
      MODE: 'test',
    }),
  ).toBe(false);
});

test('getCheckpointForLesson sends bearer and parses startable payload', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(checkpoint), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(getCheckpointForLesson('MATHEMATICS', DEV_IDS.LESSON_ID)).resolves.toEqual(
    checkpoint,
  );
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/v1/assessment/packages/MATHEMATICS/lessons/${DEV_IDS.LESSON_ID}/checkpoint`,
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer student-token' }),
    }),
  );
});

test('getCheckpointForLesson does not mock-success on 404', async () => {
  setAccessToken('student-token');
  __setAssessmentEnvForTests({ DEV: true, MODE: 'development' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );

  await expect(getCheckpointForLesson('MATHEMATICS', 'missing')).rejects.toMatchObject({
    status: 404,
  });
});

test('listAssessmentSets throws on 5xx without mock success', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );

  await expect(listAssessmentSets('MATHEMATICS')).rejects.toBeInstanceOf(ApiError);
});

test('startAssessmentSession posts purpose setId and examLanguage', async () => {
  setAccessToken('student-token');
  const sessionBody = {
    sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'IN_PROGRESS',
    purpose: 'TOPIC_PRACTICE',
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    setId: DEV_IDS.SET_TOPIC,
    mistakeId: null,
    lessonResourceId: null,
    examLanguage: 'en',
    feedbackMode: 'SET_END',
    planTaskId: null,
    questionCount: 1,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    items: [],
    context: {
      subject: 'MATHEMATICS',
      packageId: DEV_IDS.PACKAGE_ID,
      packageRevisionId: DEV_IDS.REVISION_ID,
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionPurpose: 'TOPIC_PRACTICE',
      examLanguage: 'en',
      setId: DEV_IDS.SET_TOPIC,
      lessonResourceId: null,
      mistakeId: null,
      outlineItemIds: [],
      objectiveIds: [],
      assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
      checkpointPassed: null,
    },
    createdAt: '2026-08-11T00:00:00Z',
    updatedAt: '2026-08-11T00:00:00Z',
    submittedAt: null,
  };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(sessionBody), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const session = await startAssessmentSession({
    purpose: 'TOPIC_PRACTICE',
    subject: 'MATHEMATICS',
    setId: DEV_IDS.SET_TOPIC,
    examLanguage: 'en',
  });
  expect(session.sessionId).toBe(sessionBody.sessionId);
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/assessment/sessions',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        purpose: 'TOPIC_PRACTICE',
        subject: 'MATHEMATICS',
        setId: DEV_IDS.SET_TOPIC,
        examLanguage: 'en',
      }),
    }),
  );
});
