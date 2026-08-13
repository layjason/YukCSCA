import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import * as api from './api/assessmentApi';
import MistakeDetailPage from './MistakeDetailPage';
import type { MistakeDetail } from './types';

const MISTAKE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function detail(overrides: Partial<MistakeDetail> = {}): MistakeDetail {
  return {
    mistakeId: MISTAKE_ID,
    status: 'AWAITING_REVALIDATION',
    subject: 'MATHEMATICS',
    packageId: '11111111-1111-4111-8111-111111111111',
    packageRevisionId: '22222222-2222-4222-8222-222222222222',
    questionId: '33333333-3333-4333-8333-333333333333',
    examLanguage: 'en',
    errorCause: null,
    privateNote: null,
    errorCount: 1,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    revalidationEligible: true,
    lastAttemptId: null,
    lastSessionId: null,
    sourceSetId: null,
    outlineItemIds: [],
    objectiveIds: [],
    attemptQuestion: {
      questionId: '33333333-3333-4333-8333-333333333333',
      examLanguage: 'en',
      stem: [{ kind: 'TEXT', text: 'Factorise x² − 5x + 6.' }],
      options: [{ key: 'A', blocks: [{ kind: 'TEXT', text: 'Option A' }] }],
      outlineItemIds: [],
      objectiveIds: [],
    },
    latestResponse: {
      selectedOptionKey: 'B',
      correct: false,
      correctOptionKey: 'A',
      feedback: null,
      lastSessionId: null,
      lastAttemptId: null,
      respondedAt: '2026-08-13T00:00:00Z',
    },
    remediationCandidates: [
      {
        resourceId: '44444444-4444-4444-8444-444444444444',
        kind: 'REMEDIATION',
        title: { english: 'Review: factorisation', indonesian: '', simplifiedChinese: '' },
        preferred: true,
      },
    ],
    nextDueAt: null,
    createdAt: '2026-08-13T00:00:00Z',
    updatedAt: '2026-08-13T00:00:00Z',
    ...overrides,
  };
}

function renderDetail() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/app/practice/mistakes/${MISTAKE_ID}`]}>
        <Routes>
          <Route path="/app/practice/mistakes/:mistakeId" element={<MistakeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('ready mistake offers remediations and Recheck', async () => {
  vi.spyOn(api, 'getMistake').mockResolvedValue(detail());

  renderDetail();

  expect(await screen.findByRole('button', { name: /recheck/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review: factorisation/i })).toBeInTheDocument();
});

test('passed mistake does not offer Recheck or a required remediations step', async () => {
  vi.spyOn(api, 'getMistake').mockResolvedValue(
    detail({
      status: 'REVALIDATION_PASSED',
      revalidationEligible: true,
    }),
  );

  renderDetail();

  expect(await screen.findByText(/already passed/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /recheck/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/study the review first/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review again/i })).toHaveClass('btn-secondary');
});
