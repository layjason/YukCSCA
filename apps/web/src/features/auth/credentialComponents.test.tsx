import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AccountRegistrationForm } from './AccountRegistrationForm';
import { AccountVerificationForm } from './AccountVerificationForm';
import { AccountLoginForm } from './AccountLoginForm';
import * as authApi from './authApi';
import { AuthContext } from './authContextValue';
import type { CurrentUser } from './auth.types';

vi.mock('./authApi', async () => {
  const actual = await vi.importActual<typeof import('./authApi')>('./authApi');
  return {
    ...actual,
    startCredentialRegistration: vi.fn(),
    resendCredentialVerification: vi.fn(),
    completeCredentialVerification: vi.fn(),
    loginWithCredentials: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('AccountRegistrationForm', () => {
  test('validates email format and calls startCredentialRegistration on submit', async () => {
    const mockStart = vi.mocked(authApi.startCredentialRegistration).mockResolvedValue();

    render(
      <MemoryRouter>
        <AccountRegistrationForm />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', {
      name: /kirim tautan verifikasi|send verification link/i,
    });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/email/i);
    expect(mockStart).not.toHaveBeenCalled();

    const emailInput = screen.getByRole('textbox', { name: /alamat email|email address/i });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    expect(await screen.findByText(/periksa kotak masuk|check your email/i)).toBeInTheDocument();
  });
});

describe('AccountVerificationForm', () => {
  test('clears token from address bar and validates password and terms before submitting', async () => {
    const mockComplete = vi.mocked(authApi.completeCredentialVerification).mockResolvedValue({
      outcome: 'CREDENTIAL_ACCOUNT_CREATED',
    });

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    render(
      <MemoryRouter
        initialEntries={['/verify-email#token=valid-test-token-12345&email=user@example.com']}
      >
        <AccountVerificationForm />
      </MemoryRouter>,
    );

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();

    const passwordInput = screen.getByLabelText(/^kata sandi|^password$/i);
    const confirmInput = screen.getByLabelText(/konfirmasi kata sandi|confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /ketentuan|terms/i });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /privasi|privacy/i });
    const submitBtn = screen.getByRole('button', {
      name: /selesaikan pendaftaran|complete registration/i,
    });

    // Submit with short password
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/15/);
    expect(mockComplete).not.toHaveBeenCalled();

    // Submit with valid 15+ char password
    fireEvent.change(passwordInput, { target: { value: 'valid-password-15-chars-min' } });
    fireEvent.change(confirmInput, { target: { value: 'valid-password-15-chars-min' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith({
        token: 'valid-test-token-12345',
        password: 'valid-password-15-chars-min',
        termsVersion: 'TERMS_V1',
        privacyNoticeVersion: 'PRIVACY_V1',
        termsAccepted: true,
        privacyNoticeAcknowledged: true,
      });
    });

    expect(await screen.findByText(/terverifikasi|verified/i)).toBeInTheDocument();
  });

  test('handles SIGN_IN_WITH_GOOGLE outcome when email collides with Google account', async () => {
    vi.mocked(authApi.completeCredentialVerification).mockResolvedValue({
      outcome: 'SIGN_IN_WITH_GOOGLE',
    });

    render(
      <MemoryRouter initialEntries={['/verify-email#token=valid-google-token-12345']}>
        <AccountVerificationForm />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText(/^kata sandi|^password$/i);
    const confirmInput = screen.getByLabelText(/konfirmasi kata sandi|confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /ketentuan|terms/i });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /privasi|privacy/i });
    const submitBtn = screen.getByRole('button', {
      name: /selesaikan pendaftaran|complete registration/i,
    });

    fireEvent.change(passwordInput, { target: { value: 'valid-password-15-chars-min' } });
    fireEvent.change(confirmInput, { target: { value: 'valid-password-15-chars-min' } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('heading', { name: /google/i })).toBeInTheDocument();
  });
});

describe('AccountLoginForm', () => {
  test('submits credentials and handles login', async () => {
    const mockUser: CurrentUser = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      displayName: null,
      avatarUrl: null,
      role: 'UNASSIGNED',
      onboardingCompleted: false,
    };
    const loginCredentialsMock = vi.fn().mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            status: 'anonymous',
            user: null,
            login: vi.fn(),
            loginCredentials: loginCredentialsMock,
            logout: vi.fn(),
            replaceCurrentUser: vi.fn(),
          }}
        >
          <AccountLoginForm />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByRole('textbox', { name: /alamat email|email address/i });
    const passwordInput = screen.getByLabelText(/^kata sandi|^password$/i);
    const submitBtn = screen.getByRole('button', { name: /^masuk$|^sign in$/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'valid-password-15-chars' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginCredentialsMock).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'valid-password-15-chars',
      });
    });
  });
});
