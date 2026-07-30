import { getAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  ActivateStudentProfileRequest,
  StudentActivationResult,
  StudentProfile,
} from './studentProfile.types';

const PROFILE_URL = '/api/v1/student-profile';

const isDevFallback = (): boolean => import.meta.env.DEV && import.meta.env.MODE !== 'test';

export async function activateStudentProfile(
  request: ActivateStudentProfileRequest,
): Promise<StudentActivationResult> {
  try {
    const response = await fetch(PROFILE_URL, {
      method: 'POST',
      credentials: 'include',
      headers: authorizationHeaders(),
      body: JSON.stringify(request),
    });
    if (
      isDevFallback() &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      const mockProfile: StudentProfile = {
        id: '00000000-0000-0000-0000-000000000002',
        preferredName: request.preferredName,
        birthYear: request.birthYear,
        currentGrade: request.currentGrade,
        city: request.city,
        defaultExplanationLanguage: request.defaultExplanationLanguage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result: StudentActivationResult = {
        profile: mockProfile,
        authentication: {
          accessToken: 'preview-student-token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'student@example.com',
            displayName: request.preferredName,
            avatarUrl: null,
            role: 'STUDENT',
            onboardingCompleted: true,
          },
        },
      };
      setAccessToken('preview-student-token');
      return result;
    }
    const result = await parseJsonResponse<StudentActivationResult>(response);
    setAccessToken(result.authentication.accessToken);
    return result;
  } catch (err) {
    if (isDevFallback() && (!(err instanceof ApiError) || err.status >= 500)) {
      const mockProfile: StudentProfile = {
        id: '00000000-0000-0000-0000-000000000002',
        preferredName: request.preferredName,
        birthYear: request.birthYear,
        currentGrade: request.currentGrade,
        city: request.city,
        defaultExplanationLanguage: request.defaultExplanationLanguage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result: StudentActivationResult = {
        profile: mockProfile,
        authentication: {
          accessToken: 'preview-student-token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'student@example.com',
            displayName: request.preferredName,
            avatarUrl: null,
            role: 'STUDENT',
            onboardingCompleted: true,
          },
        },
      };
      setAccessToken('preview-student-token');
      return result;
    }
    throw err;
  }
}

export async function getMyStudentProfile(): Promise<StudentProfile> {
  try {
    const response = await fetch(`${PROFILE_URL}/me`, {
      headers: authorizationHeaders(false),
    });
    if (
      isDevFallback() &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return {
        id: '00000000-0000-0000-0000-000000000002',
        preferredName: 'Ayu',
        birthYear: 2009,
        currentGrade: 'GRADE_11',
        city: 'Jakarta',
        defaultExplanationLanguage: 'id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return await parseJsonResponse<StudentProfile>(response);
  } catch (err) {
    if (isDevFallback() && (!(err instanceof ApiError) || err.status >= 500)) {
      return {
        id: '00000000-0000-0000-0000-000000000002',
        preferredName: 'Ayu',
        birthYear: 2009,
        currentGrade: 'GRADE_11',
        city: 'Jakarta',
        defaultExplanationLanguage: 'id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
