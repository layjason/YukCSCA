import { getAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  AcademicSubject,
  AssessmentSession,
  AssessmentSessionResumeSummary,
  AssessmentSessionStatus,
  AssessmentSetSummary,
  CheckpointForLesson,
  DiscloseHintResult,
  DiscloseLanguageHelpResult,
  LanguageHelpTrigger,
  ExamLanguage,
  ExplanationLanguage,
  ItemAnswerResult,
  LocalizedText,
  MistakeDetail,
  MistakeListResponseBody,
  MistakeStatus,
  PublishedRemediationDetail,
  SessionResult,
  StartAssessmentSessionRequest,
  ContentProgress,
  UpsertContentProgressRequest,
  UpdateMistakeAnnotationRequest,
} from '../types';
import {
  devCancelSession,
  devDiscloseHint,
  devDiscloseLanguageHelp,
  devGetAssessmentSession,
  devGetCheckpointForLesson,
  devGetMistake,
  devGetPublishedRemediation,
  devListAssessmentSessions,
  devListAssessmentSets,
  devListMistakes,
  devStartAssessmentSession,
  devStartRevalidation,
  devSubmitItemAnswer,
  devSubmitSession,
  devUpdateMistakeAnnotation,
  devUpsertRemediationProgress,
} from './assessmentDevFallback';

const ASSESSMENT_BASE = '/api/v1/assessment';
const ACADEMIC_BASE = '/api/v1/academic';

export type AssessmentEnv = { DEV: boolean; MODE: string };

let assessmentEnvOverride: AssessmentEnv | null = null;

/** @internal Test helper — not for production callers. */
export function __setAssessmentEnvForTests(env: AssessmentEnv | null): void {
  assessmentEnvOverride = env;
}

function readEnv(): AssessmentEnv {
  if (assessmentEnvOverride) return assessmentEnvOverride;
  return {
    DEV: Boolean(import.meta.env.DEV),
    MODE: String(import.meta.env.MODE ?? 'production'),
  };
}

function isDevFallback(): boolean {
  const env = readEnv();
  return env.DEV && env.MODE !== 'test';
}

/**
 * DEV-only offline / 401 fallback for assessment APIs.
 * Application 404 must surface so empty/not-found UI stay honest when the API is up.
 * Never mock-success on 403 / 5xx / validation / malformed.
 */
export function shouldUseAssessmentDevFallback(
  err: unknown,
  status: number | undefined,
  env: AssessmentEnv = readEnv(),
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

function assertSession(value: unknown): asserts value is AssessmentSession {
  if (
    !value ||
    typeof value !== 'object' ||
    !('sessionId' in value) ||
    !('items' in value) ||
    !('status' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid session response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertCheckpoint(value: unknown): asserts value is CheckpointForLesson {
  if (
    !value ||
    typeof value !== 'object' ||
    !('startable' in value) ||
    !('editions' in value) ||
    !('checkpointUpdatedSinceLastAttempt' in value) ||
    typeof (value as { checkpointUpdatedSinceLastAttempt: unknown })
      .checkpointUpdatedSinceLastAttempt !== 'boolean'
  ) {
    throw new ApiError(500, { title: 'Invalid checkpoint response', code: 'CONTRACT_MISMATCH' });
  }
}

function assertResult(value: unknown): asserts value is SessionResult {
  if (
    !value ||
    typeof value !== 'object' ||
    !('sessionId' in value) ||
    !('correctCount' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid session result', code: 'CONTRACT_MISMATCH' });
  }
}

function assertMistakeDetail(value: unknown): asserts value is MistakeDetail {
  if (
    !value ||
    typeof value !== 'object' ||
    !('mistakeId' in value) ||
    !('attemptQuestion' in value)
  ) {
    throw new ApiError(500, { title: 'Invalid mistake detail', code: 'CONTRACT_MISMATCH' });
  }
}

export async function getCheckpointForLesson(
  subject: AcademicSubject,
  resourceId: string,
): Promise<CheckpointForLesson> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/packages/${encodeURIComponent(subject)}/lessons/${encodeURIComponent(resourceId)}/checkpoint`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devGetCheckpointForLesson(subject, resourceId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertCheckpoint(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetCheckpointForLesson(subject, resourceId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function listAssessmentSets(
  subject: AcademicSubject,
  options?: {
    purpose?: 'CHECKPOINT' | 'TOPIC_PRACTICE';
    examLanguage?: ExamLanguage;
    outlineItemId?: string;
    objectiveId?: string;
    difficulty?: 'FOUNDATION' | 'STANDARD' | 'ADVANCED';
  },
): Promise<AssessmentSetSummary[]> {
  const query = new URLSearchParams();
  if (options?.purpose) query.set('purpose', options.purpose);
  if (options?.examLanguage) query.set('examLanguage', options.examLanguage);
  if (options?.outlineItemId) query.set('outlineItemId', options.outlineItemId);
  if (options?.objectiveId) query.set('objectiveId', options.objectiveId);
  if (options?.difficulty) query.set('difficulty', options.difficulty);
  const qs = query.toString();
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/packages/${encodeURIComponent(subject)}/sets${qs ? `?${qs}` : ''}`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      return devListAssessmentSets(subject, options?.purpose);
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!Array.isArray(data)) {
      throw new ApiError(500, { title: 'Invalid set list', code: 'CONTRACT_MISMATCH' });
    }
    return data as AssessmentSetSummary[];
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devListAssessmentSets(subject, options?.purpose);
    }
    throw err;
  }
}

export async function listAssessmentSessions(options?: {
  status?: AssessmentSessionStatus;
  subject?: AcademicSubject;
}): Promise<AssessmentSessionResumeSummary[]> {
  const query = new URLSearchParams();
  if (options?.status) query.set('status', options.status);
  if (options?.subject) query.set('subject', options.subject);
  const qs = query.toString();
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/sessions${qs ? `?${qs}` : ''}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devListAssessmentSessions(options?.status, options?.subject);
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!Array.isArray(data)) {
      throw new ApiError(500, { title: 'Invalid session list', code: 'CONTRACT_MISMATCH' });
    }
    return data as AssessmentSessionResumeSummary[];
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devListAssessmentSessions(options?.status, options?.subject);
    }
    throw err;
  }
}

export async function startAssessmentSession(
  request: StartAssessmentSessionRequest,
): Promise<AssessmentSession> {
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/sessions`, {
      method: 'POST',
      headers: authorizationHeaders(true),
      body: JSON.stringify(request),
    });
    if (isDevFallback() && response.status === 401) {
      return devStartAssessmentSession(request);
    }
    const data = await parseJsonResponse<unknown>(response);
    assertSession(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devStartAssessmentSession(request);
    }
    throw err;
  }
}

export async function getAssessmentSession(sessionId: string): Promise<AssessmentSession> {
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      const mock = devGetAssessmentSession(sessionId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertSession(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetAssessmentSession(sessionId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function discloseHint(sessionId: string, itemId: string): Promise<DiscloseHintResult> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(itemId)}/hints`,
      { method: 'POST', headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devDiscloseHint(sessionId, itemId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('item' in data) || !('disclosed' in data)) {
      throw new ApiError(500, { title: 'Invalid hint response', code: 'CONTRACT_MISMATCH' });
    }
    return data as DiscloseHintResult;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devDiscloseHint(sessionId, itemId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function discloseLanguageHelp(
  sessionId: string,
  itemId: string,
  trigger: LanguageHelpTrigger,
): Promise<DiscloseLanguageHelpResult> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(itemId)}/language-help`,
      {
        method: 'POST',
        headers: authorizationHeaders(true),
        body: JSON.stringify({ trigger }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devDiscloseLanguageHelp(sessionId, itemId, trigger);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('item' in data) || !('languageHelp' in data)) {
      throw new ApiError(500, {
        title: 'Invalid language-help response',
        code: 'CONTRACT_MISMATCH',
      });
    }
    return data as DiscloseLanguageHelpResult;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devDiscloseLanguageHelp(sessionId, itemId, trigger);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function submitItemAnswer(
  sessionId: string,
  itemId: string,
  selectedOptionKey: string,
): Promise<ItemAnswerResult> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(itemId)}/answer`,
      {
        method: 'PUT',
        headers: authorizationHeaders(true),
        body: JSON.stringify({ selectedOptionKey }),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devSubmitItemAnswer(sessionId, itemId, selectedOptionKey);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('item' in data)) {
      throw new ApiError(500, { title: 'Invalid answer response', code: 'CONTRACT_MISMATCH' });
    }
    return data as ItemAnswerResult;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devSubmitItemAnswer(sessionId, itemId, selectedOptionKey);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function submitSession(sessionId: string): Promise<SessionResult> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}/submit`,
      {
        method: 'POST',
        headers: {
          ...authorizationHeaders(false),
          'Idempotency-Key': crypto.randomUUID(),
        },
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devSubmitSession(sessionId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertResult(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devSubmitSession(sessionId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function cancelSession(sessionId: string): Promise<AssessmentSession> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/sessions/${encodeURIComponent(sessionId)}/cancel`,
      { method: 'POST', headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devCancelSession(sessionId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertSession(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devCancelSession(sessionId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function listMistakes(options?: {
  status?: MistakeStatus;
  subject?: AcademicSubject;
  cursor?: string;
  limit?: number;
}): Promise<MistakeListResponseBody> {
  const query = new URLSearchParams();
  if (options?.status) query.set('status', options.status);
  if (options?.subject) query.set('subject', options.subject);
  if (options?.cursor) query.set('cursor', options.cursor);
  if (options?.limit != null) query.set('limit', String(options.limit));
  const qs = query.toString();
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/mistakes${qs ? `?${qs}` : ''}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devListMistakes(options?.status);
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('items' in data)) {
      throw new ApiError(500, { title: 'Invalid mistake list', code: 'CONTRACT_MISMATCH' });
    }
    return data as MistakeListResponseBody;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devListMistakes(options?.status);
    }
    throw err;
  }
}

export async function getMistake(mistakeId: string): Promise<MistakeDetail> {
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/mistakes/${encodeURIComponent(mistakeId)}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      const mock = devGetMistake(mistakeId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertMistakeDetail(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetMistake(mistakeId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function updateMistakeAnnotation(
  mistakeId: string,
  body: UpdateMistakeAnnotationRequest,
): Promise<MistakeDetail> {
  try {
    const response = await fetch(`${ASSESSMENT_BASE}/mistakes/${encodeURIComponent(mistakeId)}`, {
      method: 'PATCH',
      headers: authorizationHeaders(true),
      body: JSON.stringify(body),
    });
    if (isDevFallback() && response.status === 401) {
      const mock = devUpdateMistakeAnnotation(mistakeId, body);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertMistakeDetail(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devUpdateMistakeAnnotation(mistakeId, body);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function startRevalidation(mistakeId: string): Promise<AssessmentSession> {
  try {
    const response = await fetch(
      `${ASSESSMENT_BASE}/mistakes/${encodeURIComponent(mistakeId)}/revalidation`,
      { method: 'POST', headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devStartRevalidation(mistakeId);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    assertSession(data);
    return data;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devStartRevalidation(mistakeId);
      if (mock) return mock;
    }
    throw err;
  }
}

export async function getPublishedRemediation(
  subject: AcademicSubject,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): Promise<PublishedRemediationDetail> {
  const query = new URLSearchParams({ explanationLanguage });
  try {
    const response = await fetch(
      `${ACADEMIC_BASE}/packages/${encodeURIComponent(subject)}/remediation/${encodeURIComponent(resourceId)}?${query}`,
      { headers: authorizationHeaders(false) },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devGetPublishedRemediation(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('resourceId' in data) || !('body' in data)) {
      throw new ApiError(500, { title: 'Invalid remediation response', code: 'CONTRACT_MISMATCH' });
    }
    return data as PublishedRemediationDetail;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devGetPublishedRemediation(subject, resourceId, explanationLanguage);
      if (mock) return mock;
    }
    throw err;
  }
}

/** Outline titles for Practice topic filters. Academic browse only; does not import Learn UI. */
export async function listOutlineLabels(
  subject: AcademicSubject,
): Promise<Array<{ id: string; summary: LocalizedText }>> {
  try {
    const response = await fetch(`${ACADEMIC_BASE}/packages/${encodeURIComponent(subject)}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return [];
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('outline' in data) || !Array.isArray(data.outline)) {
      throw new ApiError(500, { title: 'Invalid package browse', code: 'CONTRACT_MISMATCH' });
    }
    return data.outline
      .map((node) => {
        if (!node || typeof node !== 'object' || !('id' in node) || !('summary' in node)) {
          return null;
        }
        const id = (node as { id: unknown }).id;
        const summary = (node as { summary: unknown }).summary;
        if (typeof id !== 'string' || !summary || typeof summary !== 'object') return null;
        return { id, summary: summary as LocalizedText };
      })
      .filter((row): row is { id: string; summary: LocalizedText } => row != null);
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return [];
    }
    throw err;
  }
}

export async function upsertRemediationProgress(
  subject: AcademicSubject,
  resourceId: string,
  request: UpsertContentProgressRequest,
): Promise<ContentProgress> {
  try {
    const response = await fetch(
      `${ACADEMIC_BASE}/packages/${encodeURIComponent(subject)}/remediation/${encodeURIComponent(resourceId)}/progress`,
      {
        method: 'PUT',
        headers: authorizationHeaders(true),
        body: JSON.stringify(request),
      },
    );
    if (isDevFallback() && response.status === 401) {
      const mock = devUpsertRemediationProgress(
        subject,
        resourceId,
        request.status,
        request.resumeBlockIndex,
        request.video,
      );
      if (mock) return mock;
    }
    const data = await parseJsonResponse<unknown>(response);
    if (!data || typeof data !== 'object' || !('status' in data)) {
      throw new ApiError(500, { title: 'Invalid progress response', code: 'CONTRACT_MISMATCH' });
    }
    return data as ContentProgress;
  } catch (err) {
    if (shouldUseAssessmentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const mock = devUpsertRemediationProgress(
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
