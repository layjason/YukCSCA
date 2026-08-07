import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/httpClient';
import {
  getPublishedLesson,
  getPublishedPackageBrowse,
  listPublishedPackages,
  upsertContentProgress,
} from './learnApi';
import type {
  PublishedLessonDetail,
  PublishedPackageBrowse,
  PublishedPackageSummary,
} from '../types';

const packageSummary: PublishedPackageSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  subject: 'MATHEMATICS',
  activeRevision: {
    id: '22222222-2222-4222-8222-222222222222',
    revisionNumber: 2,
    publishedAt: '2026-08-01T00:00:00Z',
  },
  examLanguages: ['en', 'zh-CN'],
};

const browse: PublishedPackageBrowse = {
  package: packageSummary,
  officialSource: {
    subject: 'MATHEMATICS',
    authority: 'CSCA',
    editionLabel: '2025',
    sourceLinks: [{ language: 'en', url: 'https://example.com/syllabus.pdf' }],
    lastCheckedAt: '2026-08-01T00:00:00Z',
    permittedUse: 'REFERENCE_ONLY',
  },
  outline: [],
  continueLesson: null,
};

const lesson: PublishedLessonDetail = {
  packageId: packageSummary.id,
  packageRevisionId: packageSummary.activeRevision.id,
  subject: 'MATHEMATICS',
  resourceId: '33333333-3333-4333-8333-333333333333',
  title: { english: 'Factorisation', indonesian: 'Faktorisasi', simplifiedChinese: '因式分解' },
  availableExplanationLanguages: ['en', 'id'],
  requestedExplanationLanguage: 'en',
  body: {
    availability: 'AVAILABLE',
    blocks: [{ kind: 'TEXT', text: 'Hello' }],
  },
  contentProgress: { status: 'NOT_STARTED', resumeBlockIndex: null, updatedAt: null },
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
});

test('listPublishedPackages sends bearer token and returns list', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([packageSummary]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(listPublishedPackages()).resolves.toEqual([packageSummary]);
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/academic/packages',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer student-token' }),
    }),
  );
});

test('listPublishedPackages throws on 5xx without mock success', async () => {
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

  await expect(listPublishedPackages()).rejects.toBeInstanceOf(ApiError);
});

test('listPublishedPackages throws on 403 without mock success', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );

  await expect(listPublishedPackages()).rejects.toMatchObject({ status: 403 });
});

test('getPublishedPackageBrowse returns browse projection', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(browse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  await expect(getPublishedPackageBrowse('MATHEMATICS')).resolves.toEqual(browse);
});

test('getPublishedLesson includes explanationLanguage query', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(lesson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(getPublishedLesson('MATHEMATICS', lesson.resourceId, 'zh-CN')).resolves.toEqual(
    lesson,
  );

  const requestUrl = fetchMock.mock.calls[0]?.[0];
  expect(String(requestUrl)).toContain('explanationLanguage=zh-CN');
});

test('upsertContentProgress sends PUT body and returns authoritative progress', async () => {
  setAccessToken('student-token');
  const progress = {
    status: 'CONTENT_COMPLETE' as const,
    resumeBlockIndex: 2,
    updatedAt: '2026-08-07T00:00:00Z',
  };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(progress), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const result = await upsertContentProgress('MATHEMATICS', lesson.resourceId, {
    status: 'CONTENT_COMPLETE',
    resumeBlockIndex: 2,
  });
  expect(result).toEqual(progress);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/progress'),
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'CONTENT_COMPLETE', resumeBlockIndex: 2 }),
    }),
  );
});

test('malformed package list is rejected as contract failure', async () => {
  setAccessToken('student-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ not: 'an-array' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  await expect(listPublishedPackages()).rejects.toMatchObject({
    status: 500,
    code: 'CONTRACT_MISMATCH',
  });
});
