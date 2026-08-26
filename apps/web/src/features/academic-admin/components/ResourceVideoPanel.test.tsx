import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
        'admin.academic.video.removeConfirm': `Remove video attachment for ${opts?.language ?? ''}?`,
        'admin.academic.video.uploader.cancel': 'Cancel',
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
  durationSeconds: 45,
  width: 1920,
  height: 1080,
  sha256: 'sha-en',
  captionsAvailable: true,
  provenance: {
    origin: 'YUKCSCA_ORIGINAL',
    provider: 'YukCSCA Authoring',
    sourceLocator: null,
    permissionReference: 'OWNED',
    authorUserId: 'user-1',
    reviewedByUserId: null,
    reviewedAt: null,
  },
  latestValidationJob: null,
  rejection: null,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
};

describe('ResourceVideoPanel', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAcademicVideo').mockResolvedValue(mockVideoAsset);
    vi.spyOn(api, 'getSceneSpecification').mockResolvedValue({
      id: 'spec-1',
      explanationLanguage: 'en',
      registryVersion: '2026-08.4',
      segments: [],
      latestRenderJob: null,
      createdAt: '2026-08-20T00:00:00Z',
      updatedAt: '2026-08-20T00:00:00Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  test('opens confirmation dialog and removes the video attachment upon confirmation', async () => {
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

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Remove video attachment for en\?/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    const confirmButtons = screen.getAllByRole('button', { name: 'Remove video' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  test('cancels deletion when clicking Cancel in confirmation dialog', async () => {
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

    const cancelBtn = await screen.findByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/Remove video attachment for en\?/i)).not.toBeInTheDocument();
  });

  test('opens the script editor dialog from an empty language row', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue({ version: '2026-08.4', actions: [] });

    render(
      <ResourceVideoPanel
        resourceId="res-1"
        resourceKind="LESSON"
        videos={[]}
        onChange={vi.fn()}
      />,
    );

    const authorButtons = await screen.findAllByRole('button', { name: /Author script/i });
    fireEvent.click(authorButtons[0]!);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
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

  test('polls getAcademicVideo while the attachment is awaiting validation', async () => {
    vi.useFakeTimers();
    const awaiting: AcademicVideoAsset = {
      ...mockVideoAsset,
      status: 'AWAITING_VALIDATION',
      latestValidationJob: {
        id: 'job-val-1',
        kind: 'VALIDATE_UPLOAD',
        state: 'RUNNING',
        attempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sceneSpecificationId: null,
        videoAssetId: 'vid-en-1',
        error: null,
      },
    };
    const drafted: AcademicVideoAsset = { ...mockVideoAsset, status: 'DRAFT' };
    const getVideo = vi
      .spyOn(api, 'getAcademicVideo')
      .mockResolvedValueOnce(awaiting)
      .mockResolvedValue(drafted);

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

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getAllByText('Awaiting validation').length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(getVideo.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Review draft video')).toBeInTheDocument();
  });

  test('commits the draft handle when a polled render job succeeds', async () => {
    const onDurabilityCommit = vi.fn();
    vi.spyOn(api, 'getSceneSpecification').mockResolvedValue({
      id: 'spec-1',
      registryVersion: '2026-08.3',
      explanationLanguage: 'en',
      segments: [],
      latestRenderJob: {
        id: 'job-1',
        kind: 'RENDER_SCENE',
        state: 'SUCCEEDED',
        attempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sceneSpecificationId: 'spec-1',
        videoAssetId: 'vid-produced-1',
        error: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.spyOn(api, 'getAcademicVideo').mockResolvedValue({
      ...mockVideoAsset,
      id: 'vid-produced-1',
      source: 'PRODUCED',
    });

    render(
      <ResourceVideoPanel
        resourceId="res-1"
        resourceKind="LESSON"
        videos={[
          {
            language: 'en',
            videoAssetId: null,
            sceneSpecificationId: 'spec-1',
          },
        ]}
        onChange={vi.fn()}
        onDurabilityCommit={onDurabilityCommit}
      />,
    );

    await waitFor(() => {
      expect(onDurabilityCommit).toHaveBeenCalledWith([
        {
          language: 'en',
          sceneSpecificationId: 'spec-1',
          videoAssetId: 'vid-produced-1',
        },
      ]);
    });
  });
});
