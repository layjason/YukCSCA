import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DraftVideoReview } from './DraftVideoReview';
import * as api from '../api/academicAdminApi';
import type { AcademicVideoAsset, VideoPlaybackGrant } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      opts?: { language?: string; width?: number; height?: number; seconds?: number },
    ) => {
      const map: Record<string, string> = {
        'admin.academic.video.reviewModal.title': `Review video (${opts?.language ?? ''})`,
        'admin.academic.video.reviewModal.playerHeading': 'Draft video preview',
        'admin.academic.video.reviewModal.captionsHeading': 'Captions & transcript (WebVTT)',
        'admin.academic.video.reviewModal.captionsDerived':
          'Captions are automatically generated from the narration script and are read-only.',
        'admin.academic.video.reviewModal.editCaptions': 'Edit captions (VTT)',
        'admin.academic.video.reviewModal.saveCaptions': 'Save captions',
        'admin.academic.video.reviewModal.provenanceHeading': 'Provenance & source',
        'admin.academic.video.reviewModal.markReviewed': 'Mark as reviewed',
        'admin.academic.video.reviewModal.reviewedSuccess': 'Video marked as reviewed.',
        'admin.academic.video.reviewModal.close': 'Close',
        'admin.academic.video.dimensions': `${opts?.width}x${opts?.height}`,
        'admin.academic.video.duration': `${opts?.seconds}s`,
        'admin.academic.video.status.DRAFT': 'Draft (needs review)',
        'admin.academic.video.status.REVIEWED': 'Reviewed',
        'admin.academic.video.source.UPLOADED': 'Uploaded video',
        'admin.academic.video.source.PRODUCED': 'Script-produced video',
        'learn.loading': 'Loading...',
        'learn.lesson.savingProgress': 'Saving...',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockUploadedDraft: AcademicVideoAsset = {
  id: 'vid-up-1',
  source: 'UPLOADED',
  status: 'DRAFT',
  explanationLanguage: 'en',
  mediaType: 'video/mp4',
  byteSize: 2048000,
  durationSeconds: 90,
  width: 1920,
  height: 1080,
  sha256: 'sha256-abc',
  captionsAvailable: true,
  rejection: null,
  latestValidationJob: null,
  provenance: {
    origin: 'YUKCSCA_ORIGINAL',
    provider: null,
    sourceLocator: null,
    permissionReference: null,
    authorUserId: 'user-1',
    reviewedByUserId: null,
    reviewedAt: null,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGrant: VideoPlaybackGrant = {
  url: 'https://cdn.csca.mock/video.mp4',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

describe('DraftVideoReview', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAcademicVideo').mockResolvedValue(mockUploadedDraft);
    vi.spyOn(api, 'getAcademicVideoPlay').mockResolvedValue(mockGrant);
    vi.spyOn(api, 'getAcademicVideoCaptions').mockResolvedValue(
      'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nSample subtitle text.\n',
    );
  });

  test('renders video player preview and captions', async () => {
    render(
      <DraftVideoReview
        videoAssetId="vid-up-1"
        explanationLanguage="en"
        onReviewed={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Review video (en)')).toBeInTheDocument();
    expect(screen.getByText('Draft video preview')).toBeInTheDocument();
    expect(screen.getByText(/Sample subtitle text/i)).toBeInTheDocument();
    expect(screen.getByText('1920x1080')).toBeInTheDocument();
    expect(screen.getByText('90s')).toBeInTheDocument();
  });

  test('allows editing and saving WebVTT captions for uploaded drafts', async () => {
    const putCaptionsSpy = vi.spyOn(api, 'putAcademicVideoCaptions').mockResolvedValue({
      ...mockUploadedDraft,
      updatedAt: new Date().toISOString(),
    });

    render(
      <DraftVideoReview
        videoAssetId="vid-up-1"
        explanationLanguage="en"
        onReviewed={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Draft video preview');

    const editCaptionsBtn = screen.getByRole('button', { name: /Edit captions/i });
    fireEvent.click(editCaptionsBtn);

    const textarea = screen.getByDisplayValue(/Sample subtitle text/i);
    fireEvent.change(textarea, {
      target: {
        value: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nEdited subtitle text.\n',
      },
    });

    const saveCaptionsBtn = screen.getByRole('button', { name: /Save captions/i });
    fireEvent.click(saveCaptionsBtn);

    await waitFor(() => {
      expect(putCaptionsSpy).toHaveBeenCalledWith(
        'vid-up-1',
        'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nEdited subtitle text.\n',
      );
    });
  });

  test('executes review approval flow', async () => {
    const reviewedAsset: AcademicVideoAsset = {
      ...mockUploadedDraft,
      status: 'REVIEWED',
      provenance: {
        ...mockUploadedDraft.provenance,
        reviewedByUserId: 'admin-1',
        reviewedAt: new Date().toISOString(),
      },
    };

    const reviewSpy = vi.spyOn(api, 'reviewAcademicVideo').mockResolvedValue(reviewedAsset);
    const onReviewed = vi.fn();

    render(
      <DraftVideoReview
        videoAssetId="vid-up-1"
        explanationLanguage="en"
        onReviewed={onReviewed}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Review video (en)');

    const markReviewedBtn = screen.getByRole('button', {
      name: /Mark as reviewed/i,
    });
    fireEvent.click(markReviewedBtn);

    await waitFor(() => {
      expect(reviewSpy).toHaveBeenCalledWith('vid-up-1');
      expect(onReviewed).toHaveBeenCalledWith(reviewedAsset);
      expect(screen.getByText('Video marked as reviewed.')).toBeInTheDocument();
    });
  });
});
