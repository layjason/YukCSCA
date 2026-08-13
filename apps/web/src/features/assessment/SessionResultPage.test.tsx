import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import * as api from './api/assessmentApi';
import SessionResultPage from './SessionResultPage';
import type { AssessmentSession, SessionItemView, SessionResult } from './types';

const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function inProgressSession(): AssessmentSession {
  return {
    sessionId: SESSION_ID,
    status: 'IN_PROGRESS',
    purpose: 'CHECKPOINT',
    subject: 'MATHEMATICS',
    packageId: '11111111-1111-4111-8111-111111111111',
    packageRevisionId: '22222222-2222-4222-8222-222222222222',
    setId: '33333333-3333-4333-8333-333333333333',
    mistakeId: null,
    lessonResourceId: null,
    examLanguage: 'en',
    feedbackMode: 'IMMEDIATE',
    planTaskId: null,
    questionCount: 1,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    items: [],
    context: {
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      packageRevisionId: '22222222-2222-4222-8222-222222222222',
      sessionId: SESSION_ID,
      sessionPurpose: 'CHECKPOINT',
      examLanguage: 'en',
      setId: '33333333-3333-4333-8333-333333333333',
      lessonResourceId: null,
      mistakeId: null,
      outlineItemIds: [],
      objectiveIds: [],
      assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
      checkpointPassed: null,
    },
    createdAt: '2026-08-11T00:00:00Z',
    updatedAt: '2026-08-11T00:00:00Z',
    submittedAt: null,
  };
}

const MISTAKE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function reviewItem(overrides: Partial<SessionItemView> = {}): SessionItemView {
  return {
    itemId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    order: 0,
    questionId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    status: 'LOCKED',
    stem: [{ kind: 'TEXT', text: 'Factorise x² − 5x + 6.' }],
    options: [{ key: 'A', blocks: [{ kind: 'TEXT', text: 'Option A' }] }],
    hintTierCount: 1,
    disclosedTierCount: 0,
    hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: false }],
    disclosedHints: [],
    strongAssistance: false,
    selectedOptionKey: 'A',
    correct: true,
    feedback: {
      correct: true,
      correctOptionKey: 'A',
      explanations: [],
      commonMistakeNotes: [],
      relatedResources: [],
    },
    outlineItemIds: [],
    objectiveIds: [],
    ...overrides,
  };
}

function revalidationResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    sessionId: SESSION_ID,
    status: 'SUBMITTED',
    purpose: 'REVALIDATION',
    correctCount: 1,
    total: 1,
    strongAssistanceUsed: false,
    checkpointPassed: null,
    mistakeIds: [MISTAKE_ID],
    evidenceWritten: [],
    items: [reviewItem()],
    context: {
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      packageRevisionId: '22222222-2222-4222-8222-222222222222',
      sessionId: SESSION_ID,
      sessionPurpose: 'REVALIDATION',
      examLanguage: 'en',
      setId: null,
      lessonResourceId: null,
      mistakeId: MISTAKE_ID,
      outlineItemIds: [],
      objectiveIds: [],
      assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
      checkpointPassed: null,
    },
    submittedAt: '2026-08-13T00:00:00Z',
    ...overrides,
  };
}

function renderResult(result?: SessionResult) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        initialEntries={[
          result
            ? { pathname: `/app/practice/sessions/${SESSION_ID}/result`, state: { result } }
            : `/app/practice/sessions/${SESSION_ID}/result`,
        ]}
      >
        <Routes>
          <Route path="/app/practice/sessions/:sessionId/result" element={<SessionResultPage />} />
          <Route path="/app/practice/sessions/:sessionId" element={<h1>Player destination</h1>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('IN_PROGRESS result URL redirects to the player and does not submit', async () => {
  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(inProgressSession());
  const submit = vi.spyOn(api, 'submitSession');

  renderResult();

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /player destination/i })).toBeInTheDocument();
  });
  expect(submit).not.toHaveBeenCalled();
});

test('cancelled session 409 on result shows cancelled copy and Practice recovery', async () => {
  vi.spyOn(api, 'getAssessmentSession').mockRejectedValue(
    new ApiError(409, {
      title: 'Cancelled',
      code: 'SESSION_NOT_RESUMABLE',
      detail: 'Cancelled sessions cannot be resumed.',
    }),
  );

  renderResult();

  expect(
    await screen.findByText(/this session was cancelled|sesi ini dibatalkan|会话已取消/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /practice|latihan|练习/i })).toHaveAttribute(
    'href',
    '/app/practice',
  );
});

test('assisted recheck shows hint-used copy and Redo, not Review mistakes', async () => {
  const redo = vi.spyOn(api, 'startRevalidation').mockResolvedValue({
    ...inProgressSession(),
    purpose: 'REVALIDATION',
    mistakeId: MISTAKE_ID,
    sessionId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  });

  renderResult(
    revalidationResult({
      items: [
        reviewItem({
          disclosedTierCount: 1,
          hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: true }],
        }),
      ],
      context: {
        ...revalidationResult().context,
        assistanceSummary: { maxTierDisclosed: 1, strongUsed: false, languageAssistUsed: false },
      },
    }),
  );

  expect(await screen.findByRole('heading', { name: /hint used/i })).toBeInTheDocument();
  expect(screen.getByText(/does not count as independent evidence/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /review mistakes/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /redo it/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /redo it/i }));
  await waitFor(() => {
    expect(redo).toHaveBeenCalledWith(MISTAKE_ID);
  });
  expect(await screen.findByRole('heading', { name: /player destination/i })).toBeInTheDocument();
});

test('rebuilt result still treats item-level hints as assisted, not a pass', async () => {
  const submitted: AssessmentSession = {
    ...inProgressSession(),
    status: 'SUBMITTED',
    purpose: 'REVALIDATION',
    mistakeId: MISTAKE_ID,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    items: [
      reviewItem({
        disclosedTierCount: 1,
        hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: true }],
      }),
    ],
    context: {
      ...inProgressSession().context,
      sessionPurpose: 'REVALIDATION',
      mistakeId: MISTAKE_ID,
      assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
      checkpointPassed: null,
    },
    submittedAt: '2026-08-13T00:00:00Z',
  };
  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(submitted);
  vi.spyOn(api, 'listMistakes').mockResolvedValue({ items: [], nextCursor: null });

  renderResult();

  expect(await screen.findByRole('heading', { name: /hint used/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /redo it/i })).toBeInTheDocument();
});

test('item-level hint disclosure still blocks independent-pass copy', async () => {
  renderResult(
    revalidationResult({
      items: [
        reviewItem({
          disclosedTierCount: 1,
          hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: true }],
        }),
      ],
    }),
  );

  expect(await screen.findByRole('heading', { name: /hint used/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /redo it/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /review mistakes/i })).not.toBeInTheDocument();
});

test('reload of an assisted recheck result still shows Redo, not pass', async () => {
  const assistedSession: AssessmentSession = {
    ...inProgressSession(),
    status: 'SUBMITTED',
    purpose: 'REVALIDATION',
    mistakeId: MISTAKE_ID,
    submittedAt: '2026-08-13T00:00:00Z',
    assistanceSummary: { maxTierDisclosed: 1, strongUsed: false, languageAssistUsed: false },
    items: [
      reviewItem({
        disclosedTierCount: 1,
        hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: true }],
      }),
    ],
    context: {
      ...revalidationResult().context,
      assistanceSummary: { maxTierDisclosed: 1, strongUsed: false, languageAssistUsed: false },
    },
  };
  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(assistedSession);
  vi.spyOn(api, 'listMistakes').mockResolvedValue({ items: [], nextCursor: null });

  renderResult();

  expect(await screen.findByRole('heading', { name: /hint used/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /recheck passed/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /review mistakes/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /redo it/i })).toBeInTheDocument();
});

test('independent recheck pass does not offer Review mistakes or Redo', async () => {
  renderResult(revalidationResult());

  expect(await screen.findByRole('heading', { name: /recheck passed/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /review mistakes/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /redo it/i })).not.toBeInTheDocument();
});

test('incorrect recheck still offers Review mistakes', async () => {
  renderResult(
    revalidationResult({
      correctCount: 0,
      items: [reviewItem({ correct: false, selectedOptionKey: 'B' })],
    }),
  );

  expect(await screen.findByRole('heading', { name: /still needs work/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review mistakes/i })).toHaveAttribute(
    'href',
    `/app/practice/mistakes/${MISTAKE_ID}`,
  );
});
