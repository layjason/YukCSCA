import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/GoogleSignInButton', () => ({
  default: () => <div>Continue with Google</div>,
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: useAuthMock,
}));

beforeEach(() => {
  useAuthMock.mockReturnValue({
    status: 'anonymous',
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });
});

test('redirects an anonymous visitor to login', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: /belajar csca/i })).toBeInTheDocument();
});

test('login page explains the Google authentication boundary', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText(/autentikasi dasar/i)).toBeInTheDocument();
});

test('routes an unassigned account to student activation', async () => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'student@example.com',
      displayName: 'Google Name',
      avatarUrl: null,
      role: 'UNASSIGNED',
      onboardingCompleted: false,
    },
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /aktifkan profil siswa/i }),
  ).toBeInTheDocument();
});
