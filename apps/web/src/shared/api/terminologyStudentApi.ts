import { getAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  AcademicSubject,
  ExplanationLanguage,
  NotebookEntryDetail,
  NotebookListResponseBody,
  PreviewCheckResult,
  PreviewProgress,
  TermClassGroup,
  BookmarkLessonTermsResult,
  BookmarkTermRequest,
  BookmarkTermResult,
  TermLookupRequest,
  TermLookupResult,
  TerminologyPreview,
  TermReviewKind,
  TermReviewResult,
} from '@/shared/terminology/types';
import {
  devBookmarkLessonTerms,
  devBookmarkTerm,
  devGetTerminologyNotebookEntry,
  devGetTerminologyPreview,
  devListTerminologyNotebook,
  devResolveTermLookup,
  devSubmitPreviewCheck,
  devSubmitTermReview,
  devUnbookmarkTerm,
  devUpsertPreviewProgress,
} from './terminologyDevFallback';

const BASE = '/api/v1/academic';

export type TerminologyEnv = { DEV: boolean; MODE: string };

let envOverride: TerminologyEnv | null = null;

/** @internal Test helper — not for production callers. */
export function __setTerminologyEnvForTests(env: TerminologyEnv | null): void {
  envOverride = env;
}

function readEnv(): TerminologyEnv {
  if (envOverride) return envOverride;
  return {
    DEV: Boolean(import.meta.env.DEV),
    MODE: String(import.meta.env.MODE ?? 'production'),
  };
}

function isDevFallback(): boolean {
  const env = readEnv();
  return env.DEV && env.MODE !== 'test';
}

export function shouldUseTerminologyDevFallback(
  err: unknown,
  status: number | undefined,
  env: TerminologyEnv = readEnv(),
): boolean {
  if (!env.DEV || env.MODE === 'test') return false;
  if (status === 404) return false;
  if (
    status === 403 ||
    status === 400 ||
    status === 409 ||
    (status !== undefined && status >= 500)
  ) {
    return false;
  }
  if (err instanceof ApiError) {
    if (
      err.status === 404 ||
      err.status === 403 ||
      err.status === 400 ||
      err.status === 409 ||
      err.status >= 500
    ) {
      return false;
    }
    return err.status === 401;
  }
  return true;
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

function assertPreview(value: unknown): asserts value is TerminologyPreview {
  if (
    !value ||
    typeof value !== 'object' ||
    !('resourceId' in value) ||
    !('terms' in value) ||
    !('previewProgress' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid preview response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertProgress(value: unknown): asserts value is PreviewProgress {
  if (!value || typeof value !== 'object' || !('status' in value)) {
    throw new ApiError(500, { title: 'Invalid preview progress', code: 'CONTRACT_MISMATCH' });
  }
}

function assertLookup(value: unknown): asserts value is TermLookupResult {
  if (!value || typeof value !== 'object' || !('outcome' in value)) {
    throw new ApiError(500, { title: 'Invalid lookup response', code: 'CONTRACT_MISMATCH' });
  }
  const outcome = (value as { outcome: unknown }).outcome;
  if (outcome !== 'MATCHED' && outcome !== 'NOT_IN_BANK') {
    throw new ApiError(500, { title: 'Invalid lookup outcome', code: 'CONTRACT_MISMATCH' });
  }
}

function assertNotebookList(value: unknown): asserts value is NotebookListResponseBody {
  if (
    !value ||
    typeof value !== 'object' ||
    !('items' in value) ||
    !Array.isArray((value as { items: unknown }).items)
  ) {
    throw new ApiError(500, { title: 'Invalid notebook list', code: 'CONTRACT_MISMATCH' });
  }
}

function assertNotebookEntry(value: unknown): asserts value is NotebookEntryDetail {
  if (!value || typeof value !== 'object' || !('entry' in value) || !('card' in value)) {
    throw new ApiError(500, { title: 'Invalid notebook entry', code: 'CONTRACT_MISMATCH' });
  }
}

function assertReview(value: unknown): asserts value is TermReviewResult {
  if (!value || typeof value !== 'object' || !('termId' in value) || !('correct' in value)) {
    throw new ApiError(500, { title: 'Invalid review result', code: 'CONTRACT_MISMATCH' });
  }
}

function assertCheck(value: unknown): asserts value is PreviewCheckResult {
  if (
    !value ||
    typeof value !== 'object' ||
    !('correctCount' in value) ||
    !('totalCount' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid preview check', code: 'CONTRACT_MISMATCH' });
  }
}

export async function getTerminologyPreview(
  subject: AcademicSubject,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): Promise<TerminologyPreview> {
  const query = new URLSearchParams({ explanationLanguage });
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/terminology/${encodeURIComponent(resourceId)}?${query}`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devGetTerminologyPreview(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertPreview(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetTerminologyPreview(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function upsertPreviewProgress(
  subject: AcademicSubject,
  resourceId: string,
  status: 'IN_PROGRESS' | 'PREVIEW_COMPLETE',
  expectedPackageRevisionId?: string,
): Promise<PreviewProgress> {
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/terminology/${encodeURIComponent(resourceId)}/progress`,
      {
        method: 'PUT',
        headers: authorizationHeaders(true),
        body: JSON.stringify({
          status,
          ...(expectedPackageRevisionId ? { expectedPackageRevisionId } : {}),
        }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devUpsertPreviewProgress(resourceId, status);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertProgress(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devUpsertPreviewProgress(resourceId, status);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function submitPreviewCheck(
  subject: AcademicSubject,
  resourceId: string,
  pairs: Array<{ termId: string; selectedMatchKey: string }>,
): Promise<PreviewCheckResult> {
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/terminology/${encodeURIComponent(resourceId)}/checks`,
      {
        method: 'POST',
        headers: authorizationHeaders(true),
        body: JSON.stringify({ pairs }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devSubmitPreviewCheck(resourceId, pairs);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertCheck(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devSubmitPreviewCheck(resourceId, pairs);
      if (mock) return mock;
    }
    throw err;
  }
}

function assertBookmark(value: unknown): asserts value is BookmarkTermResult {
  if (!value || typeof value !== 'object' || !('card' in value) || !('entry' in value)) {
    throw new ApiError(500, { title: 'Invalid bookmark response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertLessonBookmarks(value: unknown): asserts value is BookmarkLessonTermsResult {
  if (
    !value ||
    typeof value !== 'object' ||
    !('termIds' in value) ||
    !Array.isArray((value as { termIds: unknown }).termIds)
  ) {
    throw new ApiError(500, { title: 'Invalid bookmark-all response', code: 'CONTRACT_MISMATCH' });
  }
}

export async function bookmarkTerm(
  termId: string,
  request: BookmarkTermRequest,
): Promise<BookmarkTermResult> {
  try {
    const response = await fetch(`${BASE}/terminology-notebook/${encodeURIComponent(termId)}`, {
      method: 'PUT',
      headers: authorizationHeaders(true),
      body: JSON.stringify(request),
    });
    if (isDevFallback() && response.status === 401) {
      return devBookmarkTerm(termId, request);
    }
    const data = await parseJsonResponse<unknown>(response);
    assertBookmark(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devBookmarkTerm(termId, request);
    }
    throw err;
  }
}

export async function unbookmarkTerm(termId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE}/terminology-notebook/${encodeURIComponent(termId)}`, {
      method: 'DELETE',
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      devUnbookmarkTerm(termId);
      return;
    }
    if (response.status === 204) return;
    await parseJsonResponse<unknown>(response);
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      devUnbookmarkTerm(termId);
      return;
    }
    throw err;
  }
}

export async function bookmarkLessonTerms(
  subject: AcademicSubject,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
  termIds?: readonly string[],
): Promise<BookmarkLessonTermsResult> {
  try {
    const response = await fetch(
      `${BASE}/packages/${encodeURIComponent(subject)}/terminology/${encodeURIComponent(resourceId)}/bookmarks`,
      {
        method: 'POST',
        headers: authorizationHeaders(true),
        body: JSON.stringify({
          explanationLanguage,
          ...(termIds && termIds.length > 0 ? { termIds } : {}),
        }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      return devBookmarkLessonTerms(resourceId, termIds);
    }
    const data = await parseJsonResponse<unknown>(response);
    assertLessonBookmarks(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devBookmarkLessonTerms(resourceId, termIds);
    }
    throw err;
  }
}

export async function resolveTermLookup(request: TermLookupRequest): Promise<TermLookupResult> {
  try {
    const response = await fetch(`${BASE}/term-lookups`, {
      method: 'POST',
      headers: authorizationHeaders(true),
      body: JSON.stringify(request),
    });
    if (isDevFallback() && response.status === 401) {
      return devResolveTermLookup(request);
    }
    const data = await parseJsonResponse<unknown>(response);
    assertLookup(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devResolveTermLookup(request);
    }
    throw err;
  }
}

export async function listTerminologyNotebook(options: {
  explanationLanguage: ExplanationLanguage;
  dueOnly?: boolean;
  q?: string;
  classGroup?: TermClassGroup;
  subject?: AcademicSubject;
  cursor?: string;
  limit?: number;
}): Promise<NotebookListResponseBody> {
  const query = new URLSearchParams({
    explanationLanguage: options.explanationLanguage,
  });
  if (options.dueOnly) query.set('dueOnly', 'true');
  if (options.q) query.set('q', options.q);
  if (options.classGroup) query.set('classGroup', options.classGroup);
  if (options.subject) query.set('subject', options.subject);
  if (options.cursor) query.set('cursor', options.cursor);
  if (options.limit != null) query.set('limit', String(options.limit));
  try {
    const response = await fetch(`${BASE}/terminology-notebook?${query}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devListTerminologyNotebook(options);
    }
    const data = await parseJsonResponse<unknown>(response);
    assertNotebookList(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devListTerminologyNotebook(options);
    }
    throw err;
  }
}

export async function getTerminologyNotebookEntry(
  termId: string,
  explanationLanguage: ExplanationLanguage,
): Promise<NotebookEntryDetail> {
  const query = new URLSearchParams({ explanationLanguage });
  try {
    const response = await fetch(
      `${BASE}/terminology-notebook/${encodeURIComponent(termId)}?${query}`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devGetTerminologyNotebookEntry(termId, explanationLanguage);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertNotebookEntry(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetTerminologyNotebookEntry(termId, explanationLanguage);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function submitTermReview(
  termId: string,
  kind: TermReviewKind,
  selectedOptionKey: string,
): Promise<TermReviewResult> {
  try {
    const response = await fetch(
      `${BASE}/terminology-notebook/${encodeURIComponent(termId)}/reviews`,
      {
        method: 'POST',
        headers: authorizationHeaders(true),
        body: JSON.stringify({ kind, selectedOptionKey }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devSubmitTermReview(termId, selectedOptionKey);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertReview(data);
    return data;
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devSubmitTermReview(termId, selectedOptionKey);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function getTermPronunciation(termId: string, surfaceForm?: string): Promise<Blob> {
  const query = new URLSearchParams();
  if (surfaceForm) query.set('surfaceForm', surfaceForm);
  const qs = query.toString();
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  try {
    const response = await fetch(
      `${BASE}/terms/${encodeURIComponent(termId)}/audio${qs ? `?${qs}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'audio/mpeg',
        },
      },
    );
    if (!response.ok) {
      throw new ApiError(response.status, { title: `Audio load failed (${response.status})` });
    }
    return await response.blob();
  } catch (err) {
    if (shouldUseTerminologyDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      throw err;
    }
    throw err;
  }
}
