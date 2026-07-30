import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { useAuth } from '@/features/auth/useAuth';
import { ProfilePage } from './ProfilePage';
import type { StudentProfile } from './studentProfile.types';

vi.mock('@/features/auth/useAuth');

const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@example.com',
  displayName: 'Ayu',
  avatarUrl: null,
  role: 'STUDENT' as const,
  onboardingCompleted: true,
};

const initialProfile: StudentProfile = {
  id: '00000000-0000-0000-0000-000000000002',
  preferredName: 'Ayu',
  birthYear: 2009,
  currentGrade: 'GRADE_11',
  city: 'Jakarta',
  defaultExplanationLanguage: 'id',
  createdAt: '2026-07-22T00:00:00Z',
  updatedAt: '2026-07-22T00:00:00Z',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    setAccessToken('valid-access-token');
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser,
      login: vi.fn(),
      loginCredentials: vi.fn(),
      logout: vi.fn(),
      replaceCurrentUser: vi.fn(),
    });
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  test('renders loading skeleton and populates profile once loaded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(initialProfile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ayu')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('2009')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jakarta')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /account identity|identitas akun/i }),
    ).toBeInTheDocument();
  });

  test('shows retry button on profile load failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initialProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load|gagal memuat/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again|coba lagi/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ayu')).toBeInTheDocument();
    });
  });

  test('submits valid partial update and displays success acknowledgement', async () => {
    const updatedProfile = { ...initialProfile, preferredName: 'Ayu Maya', city: 'Bandung' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initialProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(updatedProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ayu')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/preferred name|nama panggilan/i);
    const cityInput = screen.getByLabelText(/city|kota/i);

    fireEvent.change(nameInput, { target: { value: 'Ayu Maya' } });
    fireEvent.change(cityInput, { target: { value: 'Bandung' } });

    const saveBtn = screen.getByRole('button', { name: /save profile|simpan profil/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/profile updated successfully|profil berhasil diperbarui/i),
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/student-profile/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ preferredName: 'Ayu Maya', city: 'Bandung' }),
      }),
    );
  });

  test('validates birth year range and displays inline field error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(initialProfile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('2009')).toBeInTheDocument();
    });

    const yearInput = screen.getByLabelText(/birth year|tahun lahir/i);
    fireEvent.change(yearInput, { target: { value: '1990' } });

    const saveBtn = screen.getByRole('button', { name: /save profile|simpan profil/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid range|rentang yang valid/i)).toBeInTheDocument();
    });
  });

  test('handles 400 server validation error violations and maps them inline while preserving user input', async () => {
    const problem = {
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Validation failed',
      violations: [{ field: 'birthYear', code: 'OUT_OF_RANGE' }],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initialProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(problem), {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('2009')).toBeInTheDocument();
    });

    const yearInput = screen.getByLabelText(/birth year|tahun lahir/i);
    fireEvent.change(yearInput, { target: { value: '2004' } });

    const saveBtn = screen.getByRole('button', { name: /save profile|simpan profil/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid range|rentang yang valid/i)).toBeInTheDocument();
    });

    // User input is preserved
    expect(yearInput).toHaveValue('2004');
  });

  test('displays language independence notice and links', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(initialProfile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ayu')).toBeInTheDocument();
    });

    const langSelect = screen.getByLabelText(
      /default explanation language|bahasa penjelasan utama/i,
    );
    fireEvent.change(langSelect, { target: { value: 'en' } });

    expect(screen.getByText(/independen/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /languages|bahasa/i })).toHaveAttribute(
      'href',
      '/app/profile/languages',
    );
  });
});
