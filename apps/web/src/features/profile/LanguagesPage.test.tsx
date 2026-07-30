import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { LanguagesPage } from './LanguagesPage';
import type { StudentProfile } from './studentProfile.types';

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

describe('LanguagesPage', () => {
  beforeEach(() => {
    setAccessToken('valid-access-token');
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  test('loads current default explanation language and updates it via API', async () => {
    const updatedProfile = { ...initialProfile, defaultExplanationLanguage: 'en' };
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
        <LanguagesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/bahasa penjelasan utama|default explanation language/i),
      ).toBeInTheDocument();
    });

    const langSelect = screen.getByLabelText(
      /bahasa penjelasan utama|default explanation language/i,
    );
    fireEvent.change(langSelect, { target: { value: 'en' } });

    const saveBtn = screen.getByRole('button', {
      name: /save explanation language|simpan bahasa/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/updated successfully|berhasil disimpan/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/student-profile/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ defaultExplanationLanguage: 'en' }),
      }),
    );
  });

  test('displays interface language select and notes language independence', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(initialProfile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <LanguagesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /interface language|bahasa antarmuka/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /exam language|bahasa ujian/i }),
    ).toBeInTheDocument();

    const langSelect = screen.getByLabelText(
      /bahasa penjelasan utama|default explanation language/i,
    );
    fireEvent.change(langSelect, { target: { value: 'en' } });

    expect(screen.getByText(/independen/i)).toBeInTheDocument();
  });

  test('shows a retry state instead of a fabricated explanation language when loading fails', async () => {
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
        <LanguagesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load|gagal memuat/i);
    expect(
      screen.queryByLabelText(/bahasa penjelasan utama|default explanation language/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again|coba lagi/i }));

    expect(
      await screen.findByLabelText(/bahasa penjelasan utama|default explanation language/i),
    ).toHaveValue('id');
  });

  test('preserves the selected explanation language after a recoverable save failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(initialProfile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <LanguagesPage />
      </MemoryRouter>,
    );

    const langSelect = await screen.findByLabelText(
      /bahasa penjelasan utama|default explanation language/i,
    );
    fireEvent.change(langSelect, { target: { value: 'en' } });
    fireEvent.click(
      screen.getByRole('button', { name: /save explanation language|simpan bahasa/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /failed to update|gagal memperbarui/i,
    );
    expect(langSelect).toHaveValue('en');
  });
});
