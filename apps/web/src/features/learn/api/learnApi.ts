import { getAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  AcademicSubject,
  ContentProgress,
  ExplanationLanguage,
  PublishedLessonDetail,
  PublishedPackageBrowse,
  PublishedPackageSummary,
  UpsertContentProgressRequest,
  VideoPlaybackGrant,
} from '../types';
import {
  devGetPublishedLesson,
  devGetPublishedPackageBrowse,
  devGetPublishedVideoCaptions,
  devImagePlaceholderBlob,
  devListPublishedPackages,
  devPlayPublishedVideo,
  devUpsertContentProgress,
} from './learnDevFallback';

const BASE = '/api/v1/academic';

export type LearnEnv = { DEV: boolean; MODE: string };

/** Test-only override so DEV fallback policy can be driven without rebuilding Vite env. */
let learnEnvOverride: LearnEnv | null = null;

/** @internal Test helper — not for production callers. */
export function __setLearnEnvForTests(env: LearnEnv | null): void {
  learnEnvOverride = env;
}

function readLearnEnv(): LearnEnv {
  if (learnEnvOverride) return learnEnvOverride;
  return {
    DEV: Boolean(import.meta.env.DEV),
    MODE: String(import.meta.env.MODE ?? 'production'),
  };
}

function isDevFallback(): boolean {
  const env = readLearnEnv();
  return env.DEV && env.MODE !== 'test';
}

function authorizationHeaders(includeContentType = true): Record<string, string> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * DEV-only offline / 401 fallback for Learn academic APIs.
 * Application 404 (no package / unknown lesson) must surface so empty and not-found UI stay honest when the API is up.
 * Never mock-success on 403 / 5xx / validation / malformed.
 */
export function shouldUseLearnDevFallback(
  err: unknown,
  status: number | undefined,
  env: LearnEnv = readLearnEnv(),
): boolean {
  if (!env.DEV || env.MODE === 'test') return false;
  if (status === 404) return false;
  if (status === 403 || status === 400 || (status !== undefined && status >= 500)) return false;
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 403 || err.status === 400 || err.status >= 500) {
      return false;
    }
    return err.status === 401;
  }
  // Network / offline (TypeError, failed to fetch, aborted, etc.)
  return true;
}

function assertPackageList(value: unknown): asserts value is PublishedPackageSummary[] {
  if (!Array.isArray(value)) {
    throw new ApiError(500, { title: 'Invalid package list response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertBrowse(value: unknown): asserts value is PublishedPackageBrowse {
  if (!value || typeof value !== 'object' || !('package' in value) || !('outline' in value)) {
    throw new ApiError(500, {
      title: 'Invalid package browse response',
      code: 'CONTRACT_MISMATCH',
    });
  }
}

function assertLesson(value: unknown): asserts value is PublishedLessonDetail {
  if (
    !value ||
    typeof value !== 'object' ||
    !('resourceId' in value) ||
    !('body' in value) ||
    !('contentProgress' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid lesson response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertProgress(value: unknown): asserts value is ContentProgress {
  if (!value || typeof value !== 'object' || !('status' in value)) {
    throw new ApiError(500, { title: 'Invalid progress response', code: 'CONTRACT_MISMATCH' });
  }
}

export async function listPublishedPackages(): Promise<PublishedPackageSummary[]> {
  try {
    const response = await fetch(`${BASE}/packages`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devListPublishedPackages();
    }
    const data = await parseJsonResponse<unknown>(response);
    assertPackageList(data);
    return data;
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devListPublishedPackages();
    }
    throw err;
  }
}

export async function getPublishedPackageBrowse(
  subject: AcademicSubject,
): Promise<PublishedPackageBrowse> {
  try {
    const response = await fetch(`${BASE}/packages/${encodeURIComponent(subject)}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      const mock = devGetPublishedPackageBrowse(subject);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertBrowse(data);
    return data;
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetPublishedPackageBrowse(subject);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function getPublishedLesson(
  subject: AcademicSubject,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): Promise<PublishedLessonDetail> {
  const query = new URLSearchParams({ explanationLanguage });
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/lessons/${encodeURIComponent(resourceId)}?${query}`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devGetPublishedLesson(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertLesson(data);
    return data;
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetPublishedLesson(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function upsertContentProgress(
  subject: AcademicSubject,
  resourceId: string,
  request: UpsertContentProgressRequest,
): Promise<ContentProgress> {
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/lessons/${encodeURIComponent(resourceId)}/progress`,
      {
        method: 'PUT',
        headers: authorizationHeaders(true),
        body: JSON.stringify(request),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devUpsertContentProgress(
        subject,
        resourceId,
        request.status,
        request.resumeBlockIndex,
        request.video,
      );
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertProgress(data);
    return data;
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devUpsertContentProgress(
        subject,
        resourceId,
        request.status,
        request.resumeBlockIndex,
        request.video,
      );
      if (mock) return mock;
    }
    throw err;
  }
}

export async function playPublishedVideo(videoAssetId: string): Promise<VideoPlaybackGrant> {
  try {
    const response = await fetch(`${BASE}/videos/${encodeURIComponent(videoAssetId)}/play`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devPlayPublishedVideo(videoAssetId);
    }
    const data = await parseJsonResponse<VideoPlaybackGrant>(response);
    return data;
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devPlayPublishedVideo(videoAssetId);
    }
    throw err;
  }
}

export async function getPublishedVideoCaptions(videoAssetId: string): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  try {
    const response = await fetch(`${BASE}/videos/${encodeURIComponent(videoAssetId)}/captions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/vtt',
      },
    });
    if (isDevFallback() && response.status === 401) {
      return devGetPublishedVideoCaptions(videoAssetId);
    }
    if (!response.ok) {
      throw new ApiError(response.status, { title: `Captions load failed (${response.status})` });
    }
    return await response.text();
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devGetPublishedVideoCaptions(videoAssetId);
    }
    throw err;
  }
}

/**
 * Fetch published academic image bytes with bearer auth and return a blob object URL.
 * Caller must revoke the URL when done.
 */
export async function fetchPublishedAcademicImageObjectUrl(imageId: string): Promise<string> {
  try {
    const token = getAccessToken();
    if (!token) throw new ApiError(401, { title: 'Authentication required' });
    const response = await fetch(`${BASE}/images/${encodeURIComponent(imageId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'image/png,image/jpeg,image/webp,image/*',
      },
    });
    if (isDevFallback() && response.status === 401) {
      return URL.createObjectURL(devImagePlaceholderBlob());
    }
    if (!response.ok) {
      throw new ApiError(response.status, { title: `Image load failed (${response.status})` });
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    if (shouldUseLearnDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return URL.createObjectURL(devImagePlaceholderBlob());
    }
    throw err;
  }
}
