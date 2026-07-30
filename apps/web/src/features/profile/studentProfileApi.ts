import { getAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type { StudentProfile, UpdateMyStudentProfileRequest } from './studentProfile.types';

const PROFILE_ME_URL = '/api/v1/student-profile/me';

let devMockProfile: StudentProfile = {
  id: '00000000-0000-0000-0000-000000000002',
  preferredName: 'Ayu',
  birthYear: 2009,
  currentGrade: 'GRADE_11',
  city: 'Jakarta',
  defaultExplanationLanguage: 'id',
  createdAt: '2026-07-22T00:00:00Z',
  updatedAt: '2026-07-22T00:00:00Z',
};

const isDevFallback = (): boolean => import.meta.env.DEV && import.meta.env.MODE !== 'test';

export async function getMyStudentProfile(): Promise<StudentProfile> {
  try {
    const response = await fetch(PROFILE_ME_URL, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && (response.status === 404 || response.status === 401)) {
      return devMockProfile;
    }
    return await parseJsonResponse<StudentProfile>(response);
  } catch (err) {
    if (isDevFallback() && !(err instanceof ApiError)) {
      return devMockProfile;
    }
    throw err;
  }
}

export async function updateMyStudentProfile(
  request: UpdateMyStudentProfileRequest,
): Promise<StudentProfile> {
  try {
    const response = await fetch(PROFILE_ME_URL, {
      method: 'PATCH',
      headers: authorizationHeaders(true),
      body: JSON.stringify(request),
    });
    if (isDevFallback() && (response.status === 404 || response.status === 401)) {
      devMockProfile = {
        ...devMockProfile,
        ...request,
        updatedAt: new Date().toISOString(),
      };
      return devMockProfile;
    }
    return await parseJsonResponse<StudentProfile>(response);
  } catch (err) {
    if (isDevFallback() && !(err instanceof ApiError)) {
      devMockProfile = {
        ...devMockProfile,
        ...request,
        updatedAt: new Date().toISOString(),
      };
      return devMockProfile;
    }
    throw err;
  }
}

function authorizationHeaders(includeContentType = true): Record<string, string> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
}
