import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import { LearnPackagesPage } from './LearnPackagesPage';
import * as learnApi from './api/learnApi';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage(path = '/app/learn') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/learn" element={<LearnPackagesPage />} />
          <Route path="/app/learn/:subject" element={<div>browse-mathematics</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

test('shows subject hub including sole published package without auto-enter', async () => {
  vi.spyOn(learnApi, 'listPublishedPackages').mockResolvedValue([
    {
      id: '11111111-1111-4111-8111-111111111111',
      subject: 'MATHEMATICS',
      activeRevision: {
        id: '22222222-2222-4222-8222-222222222222',
        revisionNumber: 1,
        publishedAt: '2026-08-01T00:00:00Z',
      },
      examLanguages: ['en'],
    },
  ]);

  renderPage();
  expect(await screen.findByRole('heading', { name: /Mathematics/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Mathematics/i })).toHaveAttribute(
    'href',
    '/app/learn/MATHEMATICS',
  );
  expect(screen.queryByText('browse-mathematics')).not.toBeInTheDocument();
});

test('shows honest empty state when no packages', async () => {
  vi.spyOn(learnApi, 'listPublishedPackages').mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText(/No published packages yet/i)).toBeInTheDocument();
});

test('shows load failure with retry and no fabricated packages', async () => {
  const list = vi
    .spyOn(learnApi, 'listPublishedPackages')
    .mockRejectedValueOnce(new ApiError(500, { title: 'fail' }))
    .mockResolvedValueOnce([]);

  renderPage();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText(/Mathematics/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/No published packages yet/i)).toBeInTheDocument();
});
