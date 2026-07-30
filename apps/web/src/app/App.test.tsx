import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { PrototypeProvider } from '@/prototype/student/PrototypeProvider';
import { ConsumerProvider } from '@/prototype/consumer/state/ConsumerProvider';

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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });
});

function renderApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PrototypeProvider>
        <ConsumerProvider>
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );
}

test('anonymous visitor sees public Home at /', async () => {
  renderApp(['/']);
  expect(await screen.findByRole('heading', { level: 1, name: /CSCA/i })).toBeInTheDocument();
});

test('login page exposes both the preview credential form and production Google boundary', () => {
  renderApp(['/login']);
  expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^(kata sandi|password)$/i)).toBeInTheDocument();
  expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
});

test('registration page exposes both the email credential form and production Google boundary', () => {
  renderApp(['/register']);
  expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
});

test('anonymous visitor can access products page', async () => {
  renderApp(['/products']);
  expect(await screen.findByRole('heading', { name: /produk|products/i })).toBeInTheDocument();
});

test('routes an unassigned account to student activation via onboarding', async () => {
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/onboarding/student']);

  expect(
    await screen.findByRole('heading', { name: /aktifkan profil siswa/i }),
  ).toBeInTheDocument();
});

test('routes a restored unassigned Google account from root to role selection', async () => {
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/']);

  expect(
    await screen.findByRole('heading', { name: /pilih peran|choose your role/i }),
  ).toBeInTheDocument();
});

test('routes a restored student from root to production Profile when preview state resets', async () => {
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });
  setAccessToken('student-access-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '00000000-0000-0000-0000-000000000002',
          preferredName: 'Canonical Name',
          birthYear: 2009,
          currentGrade: 'GRADE_11',
          city: 'Jakarta',
          defaultExplanationLanguage: 'id',
          createdAt: '2026-07-22T00:00:00Z',
          updatedAt: '2026-07-22T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );

  try {
    renderApp(['/']);
    expect(await screen.findByDisplayValue('Canonical Name')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /target akademik/i })).not.toBeInTheDocument();
  } finally {
    clearAccessToken();
    vi.unstubAllGlobals();
  }
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/onboarding/student/goals']);

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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  renderApp(['/app/mock-exams']);

  expect(await screen.findByRole('heading', { name: /target akademik/i })).toBeInTheDocument();
  expect(screen.getByText(/dimulai ulang|started again/i)).toBeInTheDocument();
});

test('allows an authenticated student to open production Profile before preview onboarding', async () => {
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });
  setAccessToken('student-access-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '00000000-0000-0000-0000-000000000002',
          preferredName: 'Canonical Name',
          birthYear: 2009,
          currentGrade: 'GRADE_11',
          city: 'Jakarta',
          defaultExplanationLanguage: 'id',
          createdAt: '2026-07-22T00:00:00Z',
          updatedAt: '2026-07-22T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );

  try {
    renderApp(['/app/profile']);
    expect(await screen.findByDisplayValue('Canonical Name')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /target akademik/i })).not.toBeInTheDocument();
  } finally {
    clearAccessToken();
    vi.unstubAllGlobals();
  }
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
    loginCredentials: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/app/today']}>
      <PrototypeProvider initialOverrides={{ onboardingStep: 'complete' }}>
        <ConsumerProvider>
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: /hari ini/i })).toBeInTheDocument();
});

test('role selection page is accessible with preview credential session', async () => {
  render(
    <MemoryRouter initialEntries={['/onboarding/role']}>
      <PrototypeProvider>
        <ConsumerProvider
          initialState={{
            credentialSession: {
              status: 'active',
              previewSessionId: 'preview-test',
              displayEmail: 'test@example.test',
              roleIntent: 'none',
            },
          }}
        >
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: /pilih peran|choose your role/i }),
  ).toBeInTheDocument();
});

test('preview Student persona can continue into the PX-001 goals flow', async () => {
  render(
    <MemoryRouter initialEntries={['/onboarding/student/goals']}>
      <PrototypeProvider>
        <ConsumerProvider
          initialState={{
            credentialSession: {
              status: 'active',
              previewSessionId: 'preview-student',
              displayEmail: 'student@example.test',
              roleIntent: 'student',
            },
          }}
        >
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: /target akademik/i })).toBeInTheDocument();
});

test('anonymous visitor is redirected away from role selection', async () => {
  renderApp(['/onboarding/role']);
  expect(await screen.findByRole('heading', { level: 1, name: /CSCA/i })).toBeInTheDocument();
});

test('parent workspace is blocked without preview context', async () => {
  renderApp(['/parent/home']);
  expect(
    await screen.findByRole('heading', { name: /sesi pratinjau|preview session/i }),
  ).toBeInTheDocument();
});

test('parent workspace is accessible with completed parent onboarding', async () => {
  render(
    <MemoryRouter initialEntries={['/parent/home']}>
      <PrototypeProvider>
        <ConsumerProvider
          initialState={{
            credentialSession: {
              status: 'active',
              previewSessionId: 'preview-parent',
              displayEmail: 'dewi@example.test',
              roleIntent: 'parent',
            },
            parentOnboardingStep: 'complete',
            parentProfile: {
              name: 'Dewi',
              relationship: 'parent',
              contactEmail: 'dewi@example.test',
              preferredContact: 'email',
              locale: 'id',
              essentialNotifications: true,
              learningReminders: true,
              weeklyReport: true,
              riskAlerts: true,
              marketingOptIn: false,
              termsAccepted: true,
            },
          }}
        >
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: /belum ada|no student/i })).toBeInTheDocument();
});

test('preview Student persona cannot deep-link into the Parent workspace', async () => {
  render(
    <MemoryRouter initialEntries={['/parent/home']}>
      <PrototypeProvider>
        <ConsumerProvider
          initialState={{
            credentialSession: {
              status: 'active',
              previewSessionId: 'preview-student',
              displayEmail: 'student@example.test',
              roleIntent: 'student',
            },
          }}
        >
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /sesi pratinjau|preview session/i }),
  ).toBeInTheDocument();
});
