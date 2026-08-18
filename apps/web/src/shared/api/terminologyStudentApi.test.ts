import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/httpClient';
import {
  __setTerminologyEnvForTests,
  getTerminologyPreview,
  resolveTermLookup,
  shouldUseTerminologyDevFallback,
} from './terminologyStudentApi';
import { __resetTerminologyDevFallback, TERM_DEV_IDS } from './terminologyDevFallback';
import type { TerminologyPreview } from '@/shared/terminology/types';

const preview: TerminologyPreview = {
  packageId: TERM_DEV_IDS.PACKAGE_ID,
  packageRevisionId: TERM_DEV_IDS.REVISION_ID,
  subject: 'MATHEMATICS',
  resourceId: TERM_DEV_IDS.PREVIEW_ID,
  title: { english: 'Terms', indonesian: 'Istilah', simplifiedChinese: '术语' },
  outlineItemIds: [],
  lessonResourceIds: [TERM_DEV_IDS.LESSON_ID],
  requestedExplanationLanguage: 'en',
  terms: [],
  matchingPairsAvailable: false,
  matchTargets: [],
  previewProgress: {
    status: 'NOT_STARTED',
    updatedAt: null,
    requiredSetUpdatedSinceCompleted: false,
  },
};

afterEach(() => {
  clearAccessToken();
  __setTerminologyEnvForTests(null);
  __resetTerminologyDevFallback();
  vi.unstubAllGlobals();
});

test('shouldUseTerminologyDevFallback allows offline and 401 in DEV only', () => {
  expect(
    shouldUseTerminologyDevFallback(new TypeError('offline'), undefined, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(true);
  expect(
    shouldUseTerminologyDevFallback(new ApiError(401, { title: 'unauth' }), 401, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(true);
  expect(
    shouldUseTerminologyDevFallback(new ApiError(404, { title: 'missing' }), 404, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(false);
  expect(
    shouldUseTerminologyDevFallback(new ApiError(500, { title: 'boom' }), 500, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(false);
  expect(
    shouldUseTerminologyDevFallback(new ApiError(403, { title: 'forbid' }), 403, {
      DEV: true,
      MODE: 'development',
    }),
  ).toBe(false);
});

test('getTerminologyPreview sends bearer token and returns preview', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(preview), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    getTerminologyPreview('MATHEMATICS', TERM_DEV_IDS.PREVIEW_ID, 'en'),
  ).resolves.toEqual(preview);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/academic/packages/MATHEMATICS/terminology/'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer student-token' }),
    }),
  );
});

test('getTerminologyPreview rejects a malformed success payload', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  await expect(
    getTerminologyPreview('MATHEMATICS', TERM_DEV_IDS.PREVIEW_ID, 'en'),
  ).rejects.toMatchObject({ status: 500, code: 'CONTRACT_MISMATCH' });
});

test('5xx does not become a terminology development fallback', async () => {
  setAccessToken('student-token');
  __setTerminologyEnvForTests({ DEV: true, MODE: 'development' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'broken' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  await expect(
    getTerminologyPreview('MATHEMATICS', TERM_DEV_IDS.PREVIEW_ID, 'en'),
  ).rejects.toMatchObject({ status: 500 });
});

test('resolveTermLookup accepts NOT_IN_BANK as a success outcome', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ outcome: 'NOT_IN_BANK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  await expect(
    resolveTermLookup({
      subject: 'MATHEMATICS',
      explanationLanguage: 'en',
      source: 'ITEM',
      selectedText: '未收录',
      sessionId: '00000000-0000-4000-8000-000000000099',
      itemId: '00000000-0000-4000-8000-000000000098',
    }),
  ).resolves.toEqual({ outcome: 'NOT_IN_BANK' });
});
