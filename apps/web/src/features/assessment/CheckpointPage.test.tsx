import { render, screen, waitFor } from '@testing-library/react';
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
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: false,
    startable: false,
    lockReason: 'LESSON_NOT_CONTENT_COMPLETE',
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
  vi.spyOn(api, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: DEV_IDS.PACKAGE_ID,
    packageRevisionId: DEV_IDS.REVISION_ID,
    lessonResourceId: DEV_IDS.LESSON_ID,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
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
});
