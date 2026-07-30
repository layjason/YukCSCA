import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/httpClient';
import { getMyStudentProfile, updateMyStudentProfile } from './studentProfileApi';
import type { StudentProfile } from './studentProfile.types';

const mockProfile: StudentProfile = {
  id: '00000000-0000-0000-0000-000000000002',
  preferredName: 'Ayu',
  birthYear: 2009,
  currentGrade: 'GRADE_11',
  city: 'Jakarta',
  defaultExplanationLanguage: 'id',
  createdAt: '2026-07-22T00:00:00Z',
  updatedAt: '2026-07-22T00:00:00Z',
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
});

test('getMyStudentProfile sends bearer token and returns profile', async () => {
  setAccessToken('student-access-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(mockProfile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const profile = await getMyStudentProfile();
  expect(profile).toEqual(mockProfile);

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/student-profile/me',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer student-access-token' }),
    }),
  );
});

test('getMyStudentProfile throws ApiError when unauthorized', async () => {
  clearAccessToken();
  await expect(getMyStudentProfile()).rejects.toThrow(ApiError);
});

test('updateMyStudentProfile sends PATCH request with payload and bearer token', async () => {
  setAccessToken('student-access-token');
  const updatedProfile = { ...mockProfile, preferredName: 'Ayu Maya' };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(updatedProfile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const result = await updateMyStudentProfile({ preferredName: 'Ayu Maya' });
  expect(result).toEqual(updatedProfile);

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/student-profile/me',
    expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-access-token',
      }),
      body: JSON.stringify({ preferredName: 'Ayu Maya' }),
    }),
  );
});

test('updateMyStudentProfile throws ApiError with violations on 400 validation error', async () => {
  setAccessToken('student-access-token');
  const problem = {
    status: 400,
    code: 'VALIDATION_FAILED',
    title: 'Validation failed',
    violations: [{ field: 'birthYear', code: 'OUT_OF_RANGE' }],
  };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(problem), {
      status: 400,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(updateMyStudentProfile({ birthYear: 1990 })).rejects.toThrow(ApiError);
});
