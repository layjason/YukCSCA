import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import { clearAccessToken, setAccessToken } from './authStore';
import type {
  AuthResponse,
  CompleteCredentialVerificationRequest,
  CompletePasswordRecoveryRequest,
  CredentialLoginRequest,
  CredentialVerificationResult,
  CurrentUser,
  PasswordRecoveryRequest,
  ResendCredentialVerificationRequest,
  StartCredentialRegistrationRequest,
} from './auth.types';

const AUTH_BASE_URL = '/api/v1/auth';
let refreshInFlight: Promise<CurrentUser | null> | null = null;

export async function loginWithGoogle(credential: string): Promise<CurrentUser> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      const mockUser: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'google.student@example.com',
        displayName: 'Google Student',
        avatarUrl: null,
        role: 'UNASSIGNED',
        onboardingCompleted: false,
      };
      setAccessToken('preview-google-token');
      return mockUser;
    }
    const auth = await parseJsonResponse<AuthResponse>(response);
    setAccessToken(auth.accessToken);
    return auth.user;
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      const mockUser: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'google.student@example.com',
        displayName: 'Google Student',
        avatarUrl: null,
        role: 'UNASSIGNED',
        onboardingCompleted: false,
      };
      setAccessToken('preview-google-token');
      return mockUser;
    }
    throw err;
  }
}

export async function startCredentialRegistration(
  request: StartCredentialRegistrationRequest,
): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/credential-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.status === 202) {
      return;
    }
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return;
    }
    await parseJsonResponse(response);
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      return;
    }
    throw err;
  }
}

export async function resendCredentialVerification(
  request: ResendCredentialVerificationRequest,
): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/credential-verifications/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.status === 202) {
      return;
    }
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return;
    }
    await parseJsonResponse(response);
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      return;
    }
    throw err;
  }
}

export async function completeCredentialVerification(
  request: CompleteCredentialVerificationRequest,
): Promise<CredentialVerificationResult> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/credential-verifications/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return { outcome: 'CREDENTIAL_ACCOUNT_CREATED' };
    }
    return await parseJsonResponse<CredentialVerificationResult>(response);
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      return { outcome: 'CREDENTIAL_ACCOUNT_CREATED' };
    }
    throw err;
  }
}

export async function loginWithCredentials(request: CredentialLoginRequest): Promise<CurrentUser> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/credentials/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      const mockUser: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000002',
        email: request.email,
        displayName: null,
        avatarUrl: null,
        role: 'UNASSIGNED',
        onboardingCompleted: false,
      };
      setAccessToken('preview-credential-token');
      return mockUser;
    }
    const auth = await parseJsonResponse<AuthResponse>(response);
    setAccessToken(auth.accessToken);
    return auth.user;
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      const mockUser: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000002',
        email: request.email,
        displayName: null,
        avatarUrl: null,
        role: 'UNASSIGNED',
        onboardingCompleted: false,
      };
      setAccessToken('preview-credential-token');
      return mockUser;
    }
    throw err;
  }
}

async function performRefresh(): Promise<CurrentUser | null> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (response.status === 401) {
      clearAccessToken();
      return null;
    }
    if (import.meta.env.DEV && (response.status === 404 || response.status >= 500)) {
      clearAccessToken();
      return null;
    }
    const auth = await parseJsonResponse<AuthResponse>(response);
    setAccessToken(auth.accessToken);
    return auth.user;
  } catch {
    clearAccessToken();
    return null;
  }
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

export async function requestPasswordRecovery(request: PasswordRecoveryRequest): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/password-recovery-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.status === 202) {
      return;
    }
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return;
    }
    await parseJsonResponse(response);
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      return;
    }
    throw err;
  }
}

export async function completePasswordRecovery(
  request: CompletePasswordRecoveryRequest,
): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/password-recoveries/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.status === 204) {
      return;
    }
    if (
      import.meta.env.DEV &&
      (response.status === 404 || response.status === 401 || response.status >= 500)
    ) {
      return;
    }
    await parseJsonResponse(response);
  } catch (err) {
    if (import.meta.env.DEV && (!(err instanceof ApiError) || err.status >= 500)) {
      return;
    }
    throw err;
  }
}
