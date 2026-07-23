import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';
import { PrototypeProvider } from '@/prototype/student/PrototypeProvider';

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

function renderApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PrototypeProvider>
        <App />
      </PrototypeProvider>
    </MemoryRouter>,
  );
}

test('redirects an anonymous visitor to login', async () => {
  renderApp(['/']);
  expect(await screen.findByRole('heading', { name: /belajar csca/i })).toBeInTheDocument();
});

test('login page explains the Google authentication boundary', () => {
  renderApp(['/login']);
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

  renderApp(['/']);

  expect(
    await screen.findByRole('heading', { name: /aktifkan profil siswa/i }),
  ).toBeInTheDocument();
});

test('routes a student with incomplete preview onboarding to goals', async () => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'student@example.com',
      displayName: 'Test Student',
      avatarUrl: null,
      role: 'STUDENT',
      onboardingCompleted: true,
    },
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/']);

  expect(await screen.findByRole('heading', { name: /target akademik/i })).toBeInTheDocument();
});

test('blocks a direct workspace link while preview onboarding is incomplete', async () => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'student@example.com',
      displayName: 'Test Student',
      avatarUrl: null,
      role: 'STUDENT',
      onboardingCompleted: true,
    },
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/app/mock-exams']);

  expect(await screen.findByRole('heading', { name: /target akademik/i })).toBeInTheDocument();
  expect(screen.getByText(/dimulai ulang|started again/i)).toBeInTheDocument();
});

test('routes a student with complete preview onboarding to Today', async () => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'student@example.com',
      displayName: 'Test Student',
      avatarUrl: null,
      role: 'STUDENT',
      onboardingCompleted: true,
    },
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/']}>
      <PrototypeProvider initialOverrides={{ onboardingStep: 'complete' }}>
        <App />
      </PrototypeProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: /hari ini/i })).toBeInTheDocument();
});

test('routes an unsupported role to the unsupported page', async () => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'parent@example.com',
      displayName: 'Parent User',
      avatarUrl: null,
      role: 'PARENT',
      onboardingCompleted: true,
    },
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/']);

  expect(await screen.findByRole('heading', { name: /tidak tersedia/i })).toBeInTheDocument();
});
