import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import { TerminologyNotebookPage } from './TerminologyNotebookPage';

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

test('empty notebook is a valid success state', async () => {
  vi.spyOn(terminologyApi, 'listTerminologyNotebook').mockResolvedValue({
    items: [],
    nextCursor: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TerminologyNotebookPage />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/no terms collected yet/i)).toBeInTheDocument();
});

test('load more appends the next notebook page', async () => {
  const list = vi
    .spyOn(terminologyApi, 'listTerminologyNotebook')
    .mockResolvedValueOnce({
      items: [
        {
          termId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          subject: 'MATHEMATICS',
          packageId: '11111111-1111-4111-8111-111111111111',
          termClass: 'TOPIC_TERM',
          primarySurface: { text: '导数', pinyin: 'dǎoshù', audioAvailable: true },
          familiarity: 'NEW',
          due: false,
          lastReviewAt: null,
          sources: ['REQUIRED_COURSE'],
          metIn: {
            source: 'REQUIRED_COURSE',
            place: 'PREVIEW',
            topicTitle: { english: 'Limits', indonesian: 'Limit', simplifiedChinese: '极限' },
            outlineItemId: '33333333-3333-4333-8333-333333333333',
            at: '2026-08-15T00:00:00Z',
          },
          pendingReview: null,
        },
      ],
      nextCursor: 'cursor-2',
    })
    .mockResolvedValueOnce({
      items: [
        {
          termId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          subject: 'MATHEMATICS',
          packageId: '11111111-1111-4111-8111-111111111111',
          termClass: 'TOPIC_TERM',
          primarySurface: { text: '定义域', pinyin: 'dìngyìyù', audioAvailable: false },
          familiarity: 'NEW',
          due: false,
          lastReviewAt: null,
          sources: ['REQUIRED_COURSE'],
          metIn: {
            source: 'REQUIRED_COURSE',
            place: 'PREVIEW',
            topicTitle: { english: 'Limits', indonesian: 'Limit', simplifiedChinese: '极限' },
            outlineItemId: '33333333-3333-4333-8333-333333333333',
            at: '2026-08-15T00:00:00Z',
          },
          pendingReview: null,
        },
      ],
      nextCursor: null,
    });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TerminologyNotebookPage />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText('导数')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /load more/i }));
  expect(await screen.findByText('定义域')).toBeInTheDocument();
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-2', limit: 20 }));
  fireEvent.click(screen.getByRole('button', { name: /^sort$/i }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /alphabetically/i }),
  );
});

test('dueOnly query shows the empty-due success state after a remount', async () => {
  const list = vi.spyOn(terminologyApi, 'listTerminologyNotebook').mockResolvedValue({
    items: [],
    nextCursor: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/app/learn/terms?dueOnly=1']}>
        <TerminologyNotebookPage />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/you’re caught up|you're caught up/i)).toBeInTheDocument();
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({
      dueOnly: true,
      explanationLanguage: 'en',
    }),
  );
});

test('back from a practice origin returns to that session without opening a new tab', async () => {
  vi.spyOn(terminologyApi, 'listTerminologyNotebook').mockResolvedValue({
    items: [],
    nextCursor: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        initialEntries={[
          '/app/practice/sessions/sess-1',
          {
            pathname: '/app/learn/terms',
            state: { notebookReturnTo: '/app/practice/sessions/sess-1' },
          },
        ]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/app/practice/sessions/:id" element={<p>Practice session</p>} />
          <Route path="/app/learn/terms" element={<TerminologyNotebookPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/no terms collected yet/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^practice$/i }));
  expect(await screen.findByText('Practice session')).toBeInTheDocument();
});
