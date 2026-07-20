import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import { clearAccessToken, setAccessToken } from './authStore';
import type { AuthResponse, CurrentUser } from './auth.types';

const AUTH_BASE_URL = '/api/v1/auth';
let refreshInFlight: Promise<CurrentUser | null> | null = null;

export async function loginWithGoogle(credential: string): Promise<CurrentUser> {
  const response = await fetch(`${AUTH_BASE_URL}/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const auth = await parseJsonResponse<AuthResponse>(response);
  setAccessToken(auth.accessToken);
  return auth.user;
}

async function performRefresh(): Promise<CurrentUser | null> {
  const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (response.status === 401) {
    clearAccessToken();
    return null;
  }
  const auth = await parseJsonResponse<AuthResponse>(response);
  setAccessToken(auth.accessToken);
  return auth.user;
}

export function refreshSession(): Promise<CurrentUser | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok && response.status !== 401) {
      throw new ApiError(response.status, { title: 'Logout failed' });
    }
  } catch {
    // Local logout must still complete when the API is temporarily unreachable.
  } finally {
    clearAccessToken();
  }
}
