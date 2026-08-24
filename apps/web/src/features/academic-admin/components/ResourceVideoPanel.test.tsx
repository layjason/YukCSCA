import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ResourceVideoPanel } from './ResourceVideoPanel';
import * as api from '../api/academicAdminApi';
import type { AcademicVideoAsset, ResourceVideoAttachment } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { language?: string }) => {
      const map: Record<string, string> = {
        'admin.academic.video.title': 'Reviewed lesson video',
        'admin.academic.video.subtitle': 'Optional short video.',
        'admin.academic.video.attachHeading': `Reviewed video (${opts?.language ?? ''})`,
        'admin.academic.video.noVideo': 'No video attached.',
        'admin.academic.video.uploadFinished': 'Upload finished video',
        'admin.academic.video.authorScript': 'Author script',
        'admin.academic.video.reviewVideo': 'Review draft video',
        'admin.academic.video.editScript': 'Edit script',
        'admin.academic.video.removeVideo': 'Remove video',
        'admin.academic.video.retryValidation': 'Retry validation',
        'admin.academic.video.status.DRAFT': 'Draft (needs review)',
        'admin.academic.video.status.REVIEWED': 'Reviewed',
        'admin.academic.video.status.AWAITING_VALIDATION': 'Awaiting validation',
        'admin.academic.video.status.REJECTED': 'Rejected',
        'admin.academic.video.source.UPLOADED': 'Uploaded video',
        'admin.academic.video.source.PRODUCED': 'Script-produced video',
        'learn.loading': 'Loading...',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockVideoAsset: AcademicVideoAsset = {
  id: 'vid-en-1',
  source: 'UPLOADED',
  status: 'DRAFT',
  explanationLanguage: 'en',
  mediaType: 'video/mp4',
  byteSize: 1048576,
  durationSeconds: 60,
  width: 1920,
  height: 1080,
  sha256: 'sha-en',
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

describe('ResourceVideoPanel', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAcademicVideo').mockResolvedValue(mockVideoAsset);
  });

  test('renders 3 explanation language rows with empty states and attachments', async () => {
    const videos: ResourceVideoAttachment[] = [
      {
        language: 'en',
        videoAssetId: 'vid-en-1',
        sceneSpecificationId: null,
      },
    ];

    render(
      <ResourceVideoPanel
        resourceId="res-1"
        resourceKind="LESSON"
        videos={videos}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Reviewed lesson video')).toBeInTheDocument();
    expect(screen.getByText('Reviewed video (en)')).toBeInTheDocument();
    expect(screen.getByText('Reviewed video (id)')).toBeInTheDocument();
    expect(screen.getByText('Reviewed video (zh-CN)')).toBeInTheDocument();

    expect(await screen.findByText('Review draft video')).toBeInTheDocument();
  });

  test('handles removing an attachment', async () => {
    const videos: ResourceVideoAttachment[] = [
      {
        language: 'en',
        videoAssetId: 'vid-en-1',
        sceneSpecificationId: null,
      },
    ];
    const onChange = vi.fn();

    render(
      <ResourceVideoPanel
        resourceId="res-1"
        resourceKind="LESSON"
        videos={videos}
        onChange={onChange}
      />,
    );

    const removeBtn = await screen.findByRole('button', {
      name: 'Remove video',
    });
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  test('handles retry validation flow when validation failed', async () => {
    const failedAsset: AcademicVideoAsset = {
      ...mockVideoAsset,
      status: 'AWAITING_VALIDATION',
      latestValidationJob: {
        id: 'job-val-1',
        kind: 'VALIDATE_UPLOAD',
        state: 'FAILED',
        attempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sceneSpecificationId: null,
        videoAssetId: 'vid-en-1',
        error: { code: 'VALIDATION_FAILED', detail: 'Invalid codec' },
      },
    };

    vi.spyOn(api, 'getAcademicVideo').mockResolvedValue(failedAsset);
    const retrySpy = vi.spyOn(api, 'retryAcademicVideoValidation').mockResolvedValue({
      id: 'job-val-2',
      kind: 'VALIDATE_UPLOAD',
      state: 'SUCCEEDED',
      attempts: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: null,
      videoAssetId: 'vid-en-1',
      error: null,
    });

    render(
      <ResourceVideoPanel
        resourceId="res-1"
        resourceKind="LESSON"
        videos={[
          {
            language: 'en',
            videoAssetId: 'vid-en-1',
            sceneSpecificationId: null,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    const retryBtn = await screen.findByRole('button', {
      name: /Retry validation/i,
    });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(retrySpy).toHaveBeenCalledWith('vid-en-1');
    });
  });
});
