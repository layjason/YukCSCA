import { afterEach, expect, test, vi } from 'vitest';
import { getAccessToken, clearAccessToken } from './authStore';
import { refreshSession } from './authApi';
import type { AuthResponse } from './auth.types';

const authResponse: AuthResponse = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@example.com',
    displayName: 'Student',
    avatarUrl: null,
    role: 'UNASSIGNED',
    onboardingCompleted: false,
  },
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
});

test('deduplicates simultaneous refresh requests', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(authResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(first).toEqual(authResponse.user);
  expect(second).toEqual(authResponse.user);
  expect(getAccessToken()).toBe('access-token');
});

test('treats an unauthorized refresh as an anonymous session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

  await expect(refreshSession()).resolves.toBeNull();
  expect(getAccessToken()).toBeNull();
});
