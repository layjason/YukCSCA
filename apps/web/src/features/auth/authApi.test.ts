import { afterEach, expect, test, vi } from 'vitest';
import { getAccessToken, clearAccessToken } from './authStore';
import {
  completeCredentialVerification,
  completePasswordRecovery,
  loginWithCredentials,
  refreshSession,
  requestPasswordRecovery,
  resendCredentialVerification,
  startCredentialRegistration,
} from './authApi';
import type { AuthResponse, CredentialVerificationResult } from './auth.types';

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

const credentialAuthResponseNullName: AuthResponse = {
  accessToken: 'access-token-credential',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'newuser@example.com',
    displayName: null,
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

test('startCredentialRegistration sends POST request and resolves on 202', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(startCredentialRegistration({ email: 'user@example.com' })).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/credential-registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' }),
  });
});

test('resendCredentialVerification sends POST request and resolves on 202', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    resendCredentialVerification({ email: 'user@example.com' }),
  ).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/credential-verifications/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' }),
  });
});

test('completeCredentialVerification sends POST request and returns outcome', async () => {
  const verificationResult: CredentialVerificationResult = {
    outcome: 'CREDENTIAL_ACCOUNT_CREATED',
  };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(verificationResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const request = {
    token: 'valid-verification-token-string-1234567890',
    password: 'secure-password-15-chars-min',
    termsVersion: 'TERMS_V1',
    privacyNoticeVersion: 'PRIVACY_V1',
    termsAccepted: true as const,
    privacyNoticeAcknowledged: true as const,
  };

  const result = await completeCredentialVerification(request);
  expect(result).toEqual(verificationResult);
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/credential-verifications/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
});

test('loginWithCredentials authenticates user and handles null displayName', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(credentialAuthResponseNullName), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const user = await loginWithCredentials({
    email: 'newuser@example.com',
    password: 'secure-password-15-chars-min',
  });

  expect(user.displayName).toBeNull();
  expect(user.email).toBe('newuser@example.com');
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/credentials/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'newuser@example.com',
      password: 'secure-password-15-chars-min',
    }),
  });
});

test('requestPasswordRecovery sends POST request to /password-recovery-requests and resolves on 202', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(requestPasswordRecovery({ email: 'user@example.com' })).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/password-recovery-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' }),
  });
});

test('completePasswordRecovery sends POST request to /password-recoveries/complete and resolves on 204', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);

  const request = {
    token: 'valid-recovery-token-string-1234567890',
    password: 'new-secure-password-15-chars-min',
  };

  await expect(completePasswordRecovery(request)).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/password-recoveries/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
});
