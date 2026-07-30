import { getAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  ActivateStudentProfileRequest,
  StudentActivationResult,
  StudentProfile,
} from './studentProfile.types';

const PROFILE_URL = '/api/v1/student-profile';

export async function activateStudentProfile(
  request: ActivateStudentProfileRequest,
): Promise<StudentActivationResult> {
  const response = await fetch(PROFILE_URL, {
    method: 'POST',
    credentials: 'include',
    headers: authorizationHeaders(),
    body: JSON.stringify(request),
  });
  const result = await parseJsonResponse<StudentActivationResult>(response);
  setAccessToken(result.authentication.accessToken);
  return result;
}

export async function getMyStudentProfile(): Promise<StudentProfile> {
  const response = await fetch(`${PROFILE_URL}/me`, {
    headers: authorizationHeaders(false),
  });
  return parseJsonResponse<StudentProfile>(response);
}

function authorizationHeaders(includeContentType = true): Record<string, string> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
}
