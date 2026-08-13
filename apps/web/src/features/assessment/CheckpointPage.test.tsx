import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import * as api from './api/assessmentApi';
import CheckpointPage from './CheckpointPage';
import { DEV_IDS } from './api/assessmentDevFallback';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCheckpoint(resourceId = DEV_IDS.LESSON_ID) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/app/learn/MATHEMATICS/lessons/${resourceId}/checkpoint`]}>
        <Routes>
          <Route
            path="/app/learn/:subject/lessons/:resourceId/checkpoint"
            element={<CheckpointPage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

test('shows locked checkpoint with honest reason when not startable', async () => {
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([]);
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: false,
    startable: false,
    lockReason: 'LESSON_NOT_CONTENT_COMPLETE',
    checkpointUpdatedSinceLastAttempt: false,
    editions: [],
  });

  renderCheckpoint();

  await waitFor(() => {
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  expect(
    screen.getByText(/finish the lesson first|selesaikan pelajaran|请先完成课时/i),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: /start checkpoint|mulai checkpoint|开始关卡/i }),
  ).toBeNull();
});

test('shows start control when checkpoint is startable', async () => {
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([]);
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: DEV_IDS.SET_CHECKPOINT,
        examLanguage: 'en',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });

  renderCheckpoint();

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /start checkpoint|mulai checkpoint|开始关卡/i }),
    ).toBeInTheDocument();
  });
  expect(
    screen.queryByText(
      /checkpoint questions were updated|soal checkpoint diperbarui|关卡题目已更新/i,
    ),
  ).toBeNull();
});

test('surfaces soft checkpoint-updated notice and redo label when questions changed', async () => {
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([]);
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: true,
    editions: [
      {
        setId: DEV_IDS.SET_CHECKPOINT,
        examLanguage: 'en',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });

  renderCheckpoint();

  await waitFor(() => {
    expect(
      screen.getByText(
        /checkpoint questions were updated|soal checkpoint diperbarui|关卡题目已更新/i,
      ),
    ).toBeInTheDocument();
  });
  expect(
    screen.getByText(/this check changed since your last attempt|cek ini berubah|自你上次作答后/i),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', {
      name: /redo updated checkpoint|kerjakan ulang checkpoint|重做更新后的关卡/i,
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /start checkpoint|mulai checkpoint|开始关卡/i }),
  ).toBeNull();
});

test('offers continue when a matching in-progress checkpoint exists', async () => {
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: DEV_IDS.SET_CHECKPOINT,
        examLanguage: 'en',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([
    {
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'IN_PROGRESS',
      purpose: 'CHECKPOINT',
      subject: 'MATHEMATICS',
      packageId: DEV_IDS.PACKAGE_ID,
      packageRevisionId: DEV_IDS.REVISION_ID,
      setId: DEV_IDS.SET_CHECKPOINT,
      mistakeId: null,
      lessonResourceId: DEV_IDS.LESSON_ID,
      title: { english: 'Polynomial checkpoint' },
      examLanguage: 'en',
      feedbackMode: 'IMMEDIATE',
      questionCount: 2,
      answeredItemCount: 1,
      lockedItemCount: 1,
      updatedAt: '2026-08-12T00:00:00Z',
    },
  ]);

  renderCheckpoint();

  await waitFor(() => {
    expect(
      screen.getByRole('link', { name: /continue checkpoint|lanjutkan checkpoint|继续关卡/i }),
    ).toBeInTheDocument();
  });
  expect(
    screen.queryByRole('button', { name: /start checkpoint|mulai checkpoint|开始关卡/i }),
  ).toBeNull();
});

test('start new does not start when cancel fails', async () => {
  const { ApiError } = await import('@/shared/api/httpClient');
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: DEV_IDS.SET_CHECKPOINT,
        examLanguage: 'en',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });
  vi.spyOn(api, 'listAssessmentSessions').mockResolvedValue([
    {
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'IN_PROGRESS',
      purpose: 'CHECKPOINT',
      subject: 'MATHEMATICS',
      packageId: DEV_IDS.PACKAGE_ID,
      packageRevisionId: DEV_IDS.REVISION_ID,
      setId: DEV_IDS.SET_CHECKPOINT,
      mistakeId: null,
      lessonResourceId: DEV_IDS.LESSON_ID,
      title: { english: 'Polynomial checkpoint' },
      examLanguage: 'en',
      feedbackMode: 'IMMEDIATE',
      questionCount: 2,
      answeredItemCount: 1,
      lockedItemCount: 1,
      updatedAt: '2026-08-12T00:00:00Z',
    },
  ]);
  vi.spyOn(api, 'cancelSession').mockRejectedValue(new ApiError(500, { title: 'offline' }));
  const start = vi.spyOn(api, 'startAssessmentSession');

  renderCheckpoint();

  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: /start a new attempt|mulai percobaan baru|开始新的一次/i,
      }),
    ).toBeInTheDocument();
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: /start a new attempt|mulai percobaan baru|开始新的一次/i,
    }),
  );

  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  expect(start).not.toHaveBeenCalled();
});
