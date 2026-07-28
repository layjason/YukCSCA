import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { refreshSession } from '@/features/auth/authApi';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/shared/api/httpClient';
import { activateStudentProfile } from './studentProfileApi';
import StudentActivationPage from './StudentActivationPage';

vi.mock('@/features/auth/useAuth');
vi.mock('@/features/auth/authApi');
vi.mock('./studentProfileApi');

const replaceCurrentUser = vi.fn();
const currentYear = Number(
  new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date()),
);

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
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
    replaceCurrentUser,
  });
  replaceCurrentUser.mockReset();
  vi.mocked(refreshSession).mockReset();
  vi.mocked(activateStudentProfile).mockReset();
});

test('submits the confirmed profile and enters the student dashboard', async () => {
  const studentUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@example.com',
    displayName: 'Google Name',
    avatarUrl: null,
    role: 'STUDENT' as const,
    onboardingCompleted: true,
  };
  vi.mocked(activateStudentProfile).mockResolvedValue({
    profile: {
      id: '00000000-0000-0000-0000-000000000002',
      preferredName: 'Ayu',
      birthYear: currentYear - 17,
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
      user: studentUser,
    },
  });

  renderPage();
  fillValidForm();
  fireEvent.click(screen.getByRole('button', { name: /aktifkan akun siswa/i }));

  await waitFor(() =>
    expect(activateStudentProfile).toHaveBeenCalledWith({
      preferredName: 'Ayu',
      birthYear: currentYear - 17,
      currentGrade: 'GRADE_11',
      city: 'Jakarta',
      defaultExplanationLanguage: 'id',
    }),
  );
  expect(replaceCurrentUser).toHaveBeenCalledWith(studentUser);
  expect(await screen.findByText('student-goals')).toBeInTheDocument();
});

test('keeps the form local when birth year is outside the accepted range', () => {
  renderPage();
  fireEvent.change(screen.getByLabelText(/tahun lahir/i), {
    target: { value: String(currentYear - 11) },
  });
  fireEvent.click(screen.getByRole('button', { name: /aktifkan akun siswa/i }));

  expect(screen.getByText(/usia 12 sampai 21 tahun/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/tahun lahir/i)).toHaveAttribute('aria-invalid', 'true');
  expect(activateStudentProfile).not.toHaveBeenCalled();
});

test('maps a server validation violation to its profile field', async () => {
  vi.mocked(activateStudentProfile).mockRejectedValue(
    new ApiError(400, {
      code: 'VALIDATION_FAILED',
      violations: [{ field: 'city', code: 'TOO_LONG' }],
    }),
  );
  renderPage();
  fillValidForm();
  fireEvent.click(screen.getByRole('button', { name: /aktifkan akun siswa/i }));

  expect(await screen.findByText(/nilai ini terlalu panjang/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/kota/i)).toHaveValue('Jakarta');
});

test('recovers stale onboarding state by refreshing the authoritative user', async () => {
  const studentUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@example.com',
    displayName: 'Google Name',
    avatarUrl: null,
    role: 'STUDENT' as const,
    onboardingCompleted: true,
  };
  vi.mocked(activateStudentProfile).mockRejectedValue(
    new ApiError(409, { code: 'ROLE_ALREADY_ASSIGNED' }),
  );
  vi.mocked(refreshSession).mockResolvedValue(studentUser);
  renderPage();
  fillValidForm();
  fireEvent.click(screen.getByRole('button', { name: /aktifkan akun siswa/i }));

  expect(await screen.findByText('student-goals')).toBeInTheDocument();
  expect(refreshSession).toHaveBeenCalledOnce();
  expect(replaceCurrentUser).toHaveBeenCalledWith(studentUser);
});

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText(/nama panggilan/i), { target: { value: 'Ayu' } });
  fireEvent.change(screen.getByLabelText(/tahun lahir/i), {
    target: { value: String(currentYear - 17) },
  });
  fireEvent.change(screen.getByLabelText(/kelas saat ini/i), {
    target: { value: 'GRADE_11' },
  });
  fireEvent.change(screen.getByLabelText(/kota/i), { target: { value: 'Jakarta' } });
  fireEvent.change(screen.getByLabelText(/bahasa penjelasan/i), {
    target: { value: 'id' },
  });
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/onboarding/student']}>
      <Routes>
        <Route path="/onboarding/student" element={<StudentActivationPage />} />
        <Route path="/onboarding/student/goals" element={<div>student-goals</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
