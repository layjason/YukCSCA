import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/features/auth/authStore';
import { activateStudentProfile } from './studentProfileApi';
import type { StudentActivationResult } from './studentProfile.types';

const activationResult: StudentActivationResult = {
  profile: {
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Ayu',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: 'id',
    createdAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
  },
  authentication: {
    accessToken: 'student-access-token',
    tokenType: 'Bearer',
    expiresInSeconds: 900,
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'student@example.com',
      displayName: 'Google Name',
      avatarUrl: null,
      role: 'STUDENT',
      onboardingCompleted: true,
    },
  },
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
});

test('uses the current access token and replaces it from activation response', async () => {
  setAccessToken('unassigned-access-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(activationResult), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    activateStudentProfile({
      preferredName: 'Ayu',
      birthYear: 2009,
      currentGrade: 'GRADE_11',
      city: 'Jakarta',
      defaultExplanationLanguage: 'id',
    }),
  ).resolves.toEqual(activationResult);

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/student-profile',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer unassigned-access-token' }),
    }),
  );
  expect(getAccessToken()).toBe('student-access-token');
});
