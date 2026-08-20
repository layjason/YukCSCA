import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import { TerminologyNotebookEntryPage } from './TerminologyNotebookEntryPage';
import type { NotebookEntryDetail, TermReviewResult } from '@/shared/terminology/types';

const termId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const prompt = {
  kind: 'MATCH_PAIRS' as const,
  promptSurface: '导数',
  options: [
    { key: 'a', label: 'Derivative' },
    { key: 'b', label: 'Domain' },
  ],
};

function entryDetail(due = true): NotebookEntryDetail {
  return {
    entry: {
      termId,
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      termClass: 'TOPIC_TERM',
      primarySurface: { text: '导数', pinyin: 'dǎo shù', audioAvailable: false },
      familiarity: 'NEW',
      due,
      lastReviewAt: null,
      sources: ['REQUIRED_COURSE'],
      metIn: {
        source: 'REQUIRED_COURSE',
        place: 'PREVIEW',
        topicTitle: {
          english: 'Set and inequality terms',
          indonesian: 'Himpunan',
          simplifiedChinese: '集合',
        },
        outlineItemId: null,
        at: '2026-08-15T00:00:00Z',
      },
      pendingReview: due ? prompt : null,
    },
    card: {
      termId,
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      termClass: 'TOPIC_TERM',
      primarySurface: { text: '导数', pinyin: 'dǎo shù', audioAvailable: false },
      aliases: [],
      definition: {
        availability: 'AVAILABLE',
        language: 'en',
        text: 'Rate of change of a function',
      },
      englishEquivalent: 'Derivative',
      symbols: "f'(x)",
      example: '若 \\(f(x)=x^2\\)',
      outlineItemIds: [],
    },
  };
}

function reviewResult(correct: boolean): TermReviewResult {
  const detail = entryDetail(true);
  return {
    termId,
    kind: 'MATCH_PAIRS',
    correct,
    correctOptionKey: 'a',
    familiarity: correct ? 'FAMILIAR' : 'LEARNING',
    due: !correct,
    entry: {
      ...detail.entry,
      familiarity: correct ? 'FAMILIAR' : 'LEARNING',
      due: !correct,
      pendingReview: correct ? null : prompt,
    },
  };
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/app/learn/terms/${termId}`]}>
        <Routes>
          <Route path="/app/learn/terms/:termId" element={<TerminologyNotebookEntryPage />} />
          <Route path="/app/learn/terms" element={<p>Notebook list</p>} />
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

test('correct review keeps a status banner instead of dropping the prompt', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyNotebookEntry').mockResolvedValue(entryDetail());
  vi.spyOn(terminologyApi, 'submitTermReview').mockResolvedValue(reviewResult(true));

  renderPage();

  expect(
    await screen.findByRole('heading', { name: /choose the matching word/i }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Derivative' }));
  fireEvent.click(screen.getByRole('button', { name: /check/i }));

  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/nicely done/i);
  expect(screen.getByRole('button', { name: /^continue$/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Derivative' })).toBeChecked();
});

test('incorrect review names the miss and keeps the term due', async () => {
  vi.spyOn(terminologyApi, 'getTerminologyNotebookEntry').mockResolvedValue(entryDetail());
  vi.spyOn(terminologyApi, 'submitTermReview').mockResolvedValue(reviewResult(false));

  renderPage();

  expect(await screen.findByRole('radio', { name: 'Domain' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Domain' }));
  fireEvent.click(screen.getByRole('button', { name: /check/i }));

  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/not quite right/i);
  expect(screen.getByRole('button', { name: /^continue$/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Domain' })).toBeChecked();
});
