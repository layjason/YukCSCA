import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { PackageBrowsePage } from './PackageBrowsePage';
import * as learnApi from './api/learnApi';
import type { PublishedPackageBrowse } from './types';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

const browse: PublishedPackageBrowse = {
  package: {
    id: '11111111-1111-4111-8111-111111111111',
    subject: 'MATHEMATICS',
    activeRevision: {
      id: '22222222-2222-4222-8222-222222222222',
      revisionNumber: 3,
      publishedAt: '2026-08-01T00:00:00Z',
    },
    examLanguages: ['en', 'zh-CN'],
  },
  officialSource: {
    subject: 'MATHEMATICS',
    authority: 'CSCA',
    editionLabel: '2025 Edition',
    sourceLinks: [
      { language: 'en', url: 'https://example.com/en.pdf' },
      { language: 'zh-CN', url: 'https://example.com/zh.pdf' },
    ],
    lastCheckedAt: '2026-08-01T00:00:00Z',
    permittedUse: 'REFERENCE_ONLY',
  },
  outline: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      parentId: null,
      order: 0,
      summary: { english: 'Algebra', indonesian: 'Aljabar', simplifiedChinese: '代数' },
      productCoverage: 'FULLY_COVERED',
      lessons: [
        {
          resourceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          title: {
            english: 'Factorisation',
            indonesian: 'Faktorisasi',
            simplifiedChinese: '因式分解',
          },
          outlineItemIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
          contentProgress: {
            status: 'IN_PROGRESS',
            resumeBlockIndex: 1,
            updatedAt: '2026-08-06T00:00:00Z',
          },
        },
      ],
    },
  ],
  continueLesson: {
    resourceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    title: {
      english: 'Factorisation',
      indonesian: 'Faktorisasi',
      simplifiedChinese: '因式分解',
    },
    outlineItemIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    contentProgress: {
      status: 'IN_PROGRESS',
      resumeBlockIndex: 1,
      updatedAt: '2026-08-06T00:00:00Z',
    },
  },
};

function renderBrowse(path = '/app/learn/MATHEMATICS') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/learn/:subject" element={<PackageBrowsePage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

test('renders official source, continue, outline, and content progress chip', async () => {
  vi.spyOn(learnApi, 'getPublishedPackageBrowse').mockResolvedValue(browse);
  renderBrowse();

  expect(await screen.findByRole('heading', { name: /Mathematics/i })).toBeInTheDocument();
  expect(screen.getByText(/Official CSCA source/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Continue/i })).toHaveAttribute(
    'href',
    '/app/learn/MATHEMATICS/lessons/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  );
  expect(screen.getByText('Algebra')).toBeInTheDocument();
  expect(screen.getAllByText('Factorisation').length).toBeGreaterThan(0);
  expect(screen.getAllByText(/In progress/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Mastered/i)).not.toBeInTheDocument();
});

test('shows not-found empty state for missing package', async () => {
  const { ApiError } = await import('@/shared/api/httpClient');
  vi.spyOn(learnApi, 'getPublishedPackageBrowse').mockRejectedValue(
    new ApiError(404, { title: 'Not found' }),
  );
  renderBrowse();
  expect(await screen.findByText(/Package not found/i)).toBeInTheDocument();
});

test('rejects invalid subject param without calling API', async () => {
  const spy = vi.spyOn(learnApi, 'getPublishedPackageBrowse');
  renderBrowse('/app/learn/NOT_A_SUBJECT');
  expect(await screen.findByText(/Unknown subject/i)).toBeInTheDocument();
  await waitFor(() => expect(spy).not.toHaveBeenCalled());
});
