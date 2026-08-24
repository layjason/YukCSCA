import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import * as assessmentApi from './api/assessmentApi';
import * as learnApi from '@/features/learn/api/learnApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import RemediationReaderPage from './RemediationReaderPage';
import type { PublishedRemediationDetail } from './types';

const RESOURCE_ID = '44444444-4444-4444-8444-444444444444';
const MISTAKE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VIDEO_ASSET_ID = '55555555-5555-4555-8555-555555555555';

const baseRemediation: PublishedRemediationDetail = {
  packageId: '11111111-1111-4111-8111-111111111111',
  packageRevisionId: '22222222-2222-4222-8222-222222222222',
  subject: 'MATHEMATICS',
  resourceId: RESOURCE_ID,
  title: {
    english: 'Review: Polynomial factorisation',
    indonesian: 'Ulasan: Faktorisasi polinomial',
    simplifiedChinese: '复习：多项式因式分解',
  },
  availableExplanationLanguages: ['id', 'en', 'zh-CN'],
  requestedExplanationLanguage: 'en',
  outlineItemIds: [],
  objectiveIds: [],
  body: {
    availability: 'AVAILABLE',
    blocks: [
      { kind: 'TEXT', text: 'Step 1: Check for common factors.' },
      { kind: 'MATH', latex: 'ax^2 + bx + c', displayMode: true },
    ],
  },
  contentProgress: {
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    video: null,
    updatedAt: '2026-08-15T00:00:00Z',
    updatedSinceCompleted: false,
  },
};

function renderRemediation(
  path = `/app/practice/remediation/MATHEMATICS/${RESOURCE_ID}?mistakeId=${MISTAKE_ID}`,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/app/practice/remediation/:subject/:resourceId"
            element={<RemediationReaderPage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('RemediationReaderPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000002',
      preferredName: 'Ayu',
      birthYear: 2009,
      currentGrade: 'GRADE_11',
      city: 'Jakarta',
      defaultExplanationLanguage: 'en',
      createdAt: '2026-07-22T00:00:00Z',
      updatedAt: '2026-07-22T00:00:00Z',
    });
    vi.spyOn(assessmentApi, 'listAssessmentSessions').mockResolvedValue([]);
    vi.spyOn(learnApi, 'playPublishedVideo').mockResolvedValue({
      url: 'https://cdn.csca.mock/remediation-video.mp4',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    vi.spyOn(learnApi, 'getPublishedVideoCaptions').mockResolvedValue(`WEBVTT

00:00:00.000 --> 00:00:05.000
Here is how we factor polynomials.
`);
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:https://csca/mock-track');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders text and math blocks without video when resource.video is absent', async () => {
    vi.spyOn(assessmentApi, 'getPublishedRemediation').mockResolvedValue({
      ...baseRemediation,
      video: null,
    });

    renderRemediation();

    expect(
      await screen.findByRole('heading', { name: /Review: Polynomial factorisation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 1: Check for common factors.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Lesson video explanation/i)).not.toBeInTheDocument();
  });

  test('mounts LessonVideo when resource.video is present and reports playback progress', async () => {
    vi.spyOn(assessmentApi, 'getPublishedRemediation').mockResolvedValue({
      ...baseRemediation,
      video: {
        videoAssetId: VIDEO_ASSET_ID,
        durationSeconds: 180,
      },
      contentProgress: {
        status: 'IN_PROGRESS',
        resumeBlockIndex: 1,
        video: {
          videoAssetId: VIDEO_ASSET_ID,
          positionSeconds: 45,
        },
        updatedAt: '2026-08-15T00:00:00Z',
        updatedSinceCompleted: false,
      },
    });

    const upsertSpy = vi.spyOn(assessmentApi, 'upsertRemediationProgress').mockResolvedValue({
      status: 'IN_PROGRESS',
      resumeBlockIndex: 1,
      video: {
        videoAssetId: VIDEO_ASSET_ID,
        positionSeconds: 60,
      },
      updatedAt: '2026-08-15T00:00:00Z',
      updatedSinceCompleted: false,
    });

    renderRemediation();

    expect(
      await screen.findByRole('region', { name: /Lesson video explanation/i }),
    ).toBeInTheDocument();

    const videoEl = screen
      .getByRole('region', {
        name: /Lesson video explanation/i,
      })
      .querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', 'https://cdn.csca.mock/remediation-video.mp4');

    // Trigger timeupdate event beyond the throttle interval (5s)
    if (videoEl) {
      Object.defineProperty(videoEl, 'currentTime', { value: 60, writable: true });
      fireEvent.timeUpdate(videoEl);
    }

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        'MATHEMATICS',
        RESOURCE_ID,
        expect.objectContaining({
          status: 'IN_PROGRESS',
          resumeBlockIndex: 1,
          video: {
            videoAssetId: VIDEO_ASSET_ID,
            positionSeconds: 60,
          },
          expectedPackageRevisionId: baseRemediation.packageRevisionId,
        }),
      );
    });
  });

  test('handleComplete preserves video progress when marking complete', async () => {
    vi.spyOn(assessmentApi, 'getPublishedRemediation').mockResolvedValue({
      ...baseRemediation,
      video: {
        videoAssetId: VIDEO_ASSET_ID,
        durationSeconds: 180,
      },
      contentProgress: {
        status: 'IN_PROGRESS',
        resumeBlockIndex: 0,
        video: {
          videoAssetId: VIDEO_ASSET_ID,
          positionSeconds: 120,
        },
        updatedAt: '2026-08-15T00:00:00Z',
        updatedSinceCompleted: false,
      },
    });

    const upsertSpy = vi.spyOn(assessmentApi, 'upsertRemediationProgress').mockResolvedValue({
      status: 'CONTENT_COMPLETE',
      resumeBlockIndex: 0,
      video: {
        videoAssetId: VIDEO_ASSET_ID,
        positionSeconds: 120,
      },
      updatedAt: '2026-08-15T00:00:00Z',
      updatedSinceCompleted: false,
    });

    renderRemediation();

    const completeBtn = await screen.findByRole('button', { name: /Mark review done/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        'MATHEMATICS',
        RESOURCE_ID,
        expect.objectContaining({
          status: 'CONTENT_COMPLETE',
          video: {
            videoAssetId: VIDEO_ASSET_ID,
            positionSeconds: 120,
          },
          expectedPackageRevisionId: baseRemediation.packageRevisionId,
        }),
      );
    });
  });
});
