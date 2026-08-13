import { ApiError } from '@/shared/api/httpClient';
import type {
  AssessmentSessionPurpose,
  AssessmentSessionResumeSummary,
  ExamLanguage,
} from './types';

export interface SessionResumeMatch {
  purpose: AssessmentSessionPurpose;
  setId?: string | null;
  examLanguage?: ExamLanguage | null;
  lessonResourceId?: string | null;
  mistakeId?: string | null;
}

/** Most recently updated IN_PROGRESS session matching the entry identity. */
export function matchingInProgressSession(
  resumes: readonly AssessmentSessionResumeSummary[],
  match: SessionResumeMatch,
): AssessmentSessionResumeSummary | undefined {
  return resumes.find((row) => {
    if (row.status !== 'IN_PROGRESS') return false;
    if (row.purpose !== match.purpose) return false;
    if (match.setId != null && row.setId !== match.setId) return false;
    if (match.examLanguage != null && row.examLanguage !== match.examLanguage) return false;
    if (match.lessonResourceId != null && row.lessonResourceId !== match.lessonResourceId) {
      return false;
    }
    if (match.mistakeId != null && row.mistakeId !== match.mistakeId) return false;
    return true;
  });
}

export function matchingInProgressForSet(
  resumes: readonly AssessmentSessionResumeSummary[],
  setId: string,
  examLanguage: ExamLanguage,
): AssessmentSessionResumeSummary | undefined {
  return matchingInProgressSession(resumes, {
    purpose: 'TOPIC_PRACTICE',
    setId,
    examLanguage,
  });
}

export type StartReplacingInProgressResult<T extends { sessionId: string }> =
  { ok: true; session: T } | { ok: false; reason: 'CANCEL_FAILED' | 'STILL_RESUMED' };

/**
 * Start-new must cancel the live row first. Backend start resumes any leftover
 * IN_PROGRESS identity, so a swallowed cancel would reopen the old answers.
 */
export async function startReplacingInProgressSession<T extends { sessionId: string }>(options: {
  existingSessionId: string | undefined;
  cancel: (sessionId: string) => Promise<unknown>;
  start: () => Promise<T>;
}): Promise<StartReplacingInProgressResult<T>> {
  const existingId = options.existingSessionId;
  if (existingId) {
    try {
      await options.cancel(existingId);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        return { ok: false, reason: 'CANCEL_FAILED' };
      }
    }
  }
  const session = await options.start();
  if (existingId && session.sessionId === existingId) {
    return { ok: false, reason: 'STILL_RESUMED' };
  }
  return { ok: true, session };
}
