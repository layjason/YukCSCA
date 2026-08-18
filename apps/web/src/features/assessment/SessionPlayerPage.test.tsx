import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import * as api from './api/assessmentApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import SessionPlayerPage from './SessionPlayerPage';
import type { AssessmentSession, SessionItemView, SessionResult } from './types';

const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function lockedItem(id: string, order: number): SessionItemView {
  return {
    itemId: id,
    order,
    questionId: `q-${id}`,
    status: 'LOCKED',
    stem: [{ kind: 'TEXT', text: `Stem ${order + 1}` }],
    options: [
      { key: 'A', blocks: [{ kind: 'TEXT', text: 'A' }] },
      { key: 'B', blocks: [{ kind: 'TEXT', text: 'B' }] },
    ],
    hintTierCount: 0,
    disclosedTierCount: 0,
    hintLadder: [],
    disclosedHints: [],
    strongAssistance: false,
    selectedOptionKey: 'A',
    correct: order === 0,
    feedback: {
      correct: order === 0,
      correctOptionKey: 'A',
      explanations: [],
      commonMistakeNotes: [],
      relatedResources: [],
    },
    outlineItemIds: [],
    objectiveIds: [],
    languageHelpAvailable: false,
  };
}

function baseSession(overrides: Partial<AssessmentSession> = {}): AssessmentSession {
  const items = [lockedItem('item-1', 0), lockedItem('item-2', 1)];
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
    questionCount: items.length,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    items,
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
    ...overrides,
  };
}

function renderPlayer() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/app/practice/sessions/${SESSION_ID}`]}>
        <Routes>
          <Route path="/app/practice/sessions/:sessionId" element={<SessionPlayerPage />} />
          <Route
            path="/app/practice/sessions/:sessionId/result"
            element={<h1>Result destination</h1>}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Jia',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: 'en',
    createdAt: '2026-08-11T00:00:00Z',
    updatedAt: '2026-08-11T00:00:00Z',
  });
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('IMMEDIATE all-locked IN_PROGRESS session shows Finish and recovers after submit failure', async () => {
  const session = baseSession();
  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(session);

  const submit = vi.spyOn(api, 'submitSession');
  submit.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({
    sessionId: SESSION_ID,
    status: 'SUBMITTED',
    purpose: 'CHECKPOINT',
    correctCount: 1,
    total: 2,
    strongAssistanceUsed: false,
    checkpointPassed: false,
    mistakeIds: [],
    evidenceWritten: [],
    items: session.items,
    context: { ...session.context, checkpointPassed: false },
    submittedAt: '2026-08-11T00:01:00Z',
  } satisfies SessionResult);

  renderPlayer();

  const finish = await screen.findByRole('button', { name: /finish|selesai|完成/i });
  expect(finish).toBeEnabled();

  fireEvent.click(finish);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /could not submit|tidak dapat mengirim|无法提交/i,
  );
  // Finish remains after submit failure so the student is not stuck.
  const retry = screen.getByRole('button', { name: /finish|selesai|完成/i });
  expect(retry).toBeEnabled();

  fireEvent.click(retry);
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /result destination/i })).toBeInTheDocument();
  });
  expect(submit).toHaveBeenCalledTimes(2);
});

test('handleLock maps answer failure separately from finish submit failure', async () => {
  const openItem: SessionItemView = {
    ...lockedItem('item-open', 0),
    status: 'OPEN',
    selectedOptionKey: null,
    correct: null,
    feedback: null,
  };
  const otherLocked = lockedItem('item-2', 1);
  const session = baseSession({
    items: [openItem, otherLocked],
    questionCount: 2,
  });

  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(session);
  const answer = vi.spyOn(api, 'submitItemAnswer').mockRejectedValue(new Error('answer boom'));
  const submit = vi.spyOn(api, 'submitSession');

  renderPlayer();

  await screen.findByText(/Stem 1/i);
  fireEvent.click(screen.getByDisplayValue('A'));
  fireEvent.click(screen.getByRole('button', { name: /check|periksa|检查/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /could not save your answer|tidak dapat menyimpan jawaban|无法保存答案/i,
  );
  expect(answer).toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});

test('cancelled session 409 shows a specific recovery path', async () => {
  vi.spyOn(api, 'getAssessmentSession').mockRejectedValue(
    new ApiError(409, {
      title: 'Cancelled',
      code: 'SESSION_NOT_RESUMABLE',
      detail: 'Cancelled sessions cannot be resumed.',
    }),
  );

  renderPlayer();

  expect(
    await screen.findByText(/this session was cancelled|sesi ini dibatalkan|会话已取消/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /practice|latihan|练习/i })).toHaveAttribute(
    'href',
    '/app/practice',
  );
});

test('SET_END wording-hard after submit patches TERMINOLOGY_MISUNDERSTANDING', async () => {
  const incorrect: SessionItemView = {
    ...lockedItem('item-1', 0),
    status: 'OPEN',
    questionId: 'q-wording',
    selectedOptionKey: 'B',
    correct: null,
    feedback: null,
    languageHelpAvailable: true,
  };
  const other: SessionItemView = {
    ...lockedItem('item-2', 1),
    status: 'OPEN',
    selectedOptionKey: 'A',
    correct: null,
    feedback: null,
    languageHelpAvailable: true,
  };
  const session = baseSession({
    feedbackMode: 'SET_END',
    items: [incorrect, other],
  });
  const submittedItems: SessionItemView[] = [
    {
      ...incorrect,
      status: 'LOCKED',
      correct: false,
      feedback: {
        correct: false,
        correctOptionKey: 'A',
        explanations: [],
        commonMistakeNotes: [],
        relatedResources: [],
      },
    },
    {
      ...other,
      status: 'LOCKED',
      correct: true,
      feedback: {
        correct: true,
        correctOptionKey: 'A',
        explanations: [],
        commonMistakeNotes: [],
        relatedResources: [],
      },
    },
  ];

  vi.spyOn(api, 'getAssessmentSession').mockResolvedValue(session);
  vi.spyOn(api, 'submitSession').mockResolvedValue({
    sessionId: SESSION_ID,
    status: 'SUBMITTED',
    purpose: 'CHECKPOINT',
    correctCount: 1,
    total: 2,
    strongAssistanceUsed: false,
    checkpointPassed: false,
    mistakeIds: ['mistake-1'],
    evidenceWritten: [],
    items: submittedItems,
    context: { ...session.context, checkpointPassed: false },
    submittedAt: '2026-08-11T00:01:00Z',
  } satisfies SessionResult);
  vi.spyOn(api, 'getMistake').mockResolvedValue({
    mistakeId: 'mistake-1',
    questionId: 'q-wording',
  } as Awaited<ReturnType<typeof api.getMistake>>);
  const annotate = vi
    .spyOn(api, 'updateMistakeAnnotation')
    .mockResolvedValue({} as Awaited<ReturnType<typeof api.updateMistakeAnnotation>>);
  const disclose = vi.spyOn(api, 'discloseLanguageHelp');

  renderPlayer();

  fireEvent.click(await screen.findByRole('button', { name: /submit set|kirim set|提交本套/i }));
  expect(await screen.findByText(/was the wording hard/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /yes, the wording was hard/i }));

  await waitFor(() => {
    expect(annotate).toHaveBeenCalledWith('mistake-1', {
      errorCause: 'TERMINOLOGY_MISUNDERSTANDING',
    });
  });
  expect(disclose).not.toHaveBeenCalled();
});
