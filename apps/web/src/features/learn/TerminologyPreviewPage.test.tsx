import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import { TerminologyPreviewPage } from './TerminologyPreviewPage';
import type { TerminologyPreview } from '@/shared/terminology/types';

const preview: TerminologyPreview = {
  packageId: '11111111-1111-4111-8111-111111111111',
  packageRevisionId: '22222222-2222-4222-8222-222222222222',
  subject: 'MATHEMATICS',
  resourceId: '44444444-4444-4444-8444-444444444444',
  title: { english: 'Required terms', indonesian: 'Istilah wajib', simplifiedChinese: '必学术语' },
  outlineItemIds: [],
  lessonResourceIds: ['33333333-3333-4333-8333-333333333333'],
  requestedExplanationLanguage: 'en',
  terms: [
    {
      termId: '55555555-5555-4555-8555-555555555555',
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      termClass: 'TOPIC_TERM',
      primarySurface: { text: '公因式', pinyin: 'gōng yīn shì', audioAvailable: false },
      aliases: [],
      definition: { availability: 'AVAILABLE', language: 'en', text: 'Common factor' },
      englishEquivalent: 'common factor',

      symbols: null,
      example: null,
      outlineItemIds: [],
    },
  ],
  matchingPairsAvailable: true,
  matchTargets: [
    {
      termId: '55555555-5555-4555-8555-555555555555',
      matchKey: '55555555-5555-4555-8555-555555555555',
      promptSurface: '公因式',
      matchLabel: 'common factor',
    },
  ],
  previewProgress: {
    status: 'NOT_STARTED',
    updatedAt: null,
    requiredSetUpdatedSinceCompleted: false,
  },
};

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        initialEntries={[
          `/app/learn/MATHEMATICS/terminology/${preview.resourceId}?lessonResourceId=${preview.lessonResourceIds[0]}`,
        ]}
      >
        <Routes>
          <Route
            path="/app/learn/:subject/terminology/:resourceId"
            element={<TerminologyPreviewPage />}
          />
          <Route
            path="/app/learn/:subject/lessons/:resourceId"
            element={<h1>Lesson destination</h1>}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Jia',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: 'en',
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('loads preview cards and keeps Continue available without matching pairs', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockResolvedValue(preview);
  vi.spyOn(terminologyApi, 'upsertPreviewProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    updatedAt: '2026-08-15T00:00:00Z',
    requiredSetUpdatedSinceCompleted: false,
  });

  renderPage();

  expect(await screen.findByText('公因式')).toBeInTheDocument();
  expect(screen.getByText('gōng yīn shì')).toBeInTheDocument();
  expect(screen.getByText('Common factor')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue to lesson/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /practice these terms/i })).toBeInTheDocument();
  expect(screen.queryByText(/mastered/i)).not.toBeInTheDocument();
});

test('keeps cards when collecting preview progress fails', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockResolvedValue(preview);
  vi.spyOn(terminologyApi, 'upsertPreviewProgress').mockRejectedValue(
    new ApiError(500, { title: 'broken' }),
  );

  renderPage();

  expect(await screen.findByText('公因式')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue to lesson/i })).toBeEnabled();
  expect(
    await screen.findByText(/could not be saved|gagal disimpan|无法保存/i),
  ).toBeInTheDocument();
});

test('acknowledges an updated required set so the notice leaves the preview', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockResolvedValue({
    ...preview,
    previewProgress: {
      status: 'PREVIEW_COMPLETE',
      updatedAt: '2026-08-18T00:00:00Z',
      requiredSetUpdatedSinceCompleted: true,
    },
  });
  const upsert = vi.spyOn(terminologyApi, 'upsertPreviewProgress').mockResolvedValue({
    status: 'PREVIEW_COMPLETE',
    updatedAt: '2026-08-19T00:00:00Z',
    requiredSetUpdatedSinceCompleted: false,
  });

  renderPage();

  await waitFor(() => {
    expect(upsert).toHaveBeenCalledWith(
      'MATHEMATICS',
      preview.resourceId,
      'PREVIEW_COMPLETE',
      preview.packageRevisionId,
    );
  });
  await waitFor(() => {
    expect(screen.queryByText(/required terms changed/i)).not.toBeInTheDocument();
  });
  expect(document.querySelector('.learn-update-banner')).toBeNull();
});

test('shows a recoverable error without fabricating cards', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockRejectedValue(
    new ApiError(500, { title: 'broken' }),
  );

  renderPage();

  expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  expect(screen.queryByText('公因式')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  await waitFor(() => {
    expect(terminologyApi.getTerminologyPreview).toHaveBeenCalledTimes(2);
  });
});
