import { beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import * as api from './academicAdminApi';

describe('academicAdminApi - Video endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
    setAccessToken('admin-test-token');
  });

  test('createVideoUploadSlot calls POST /api/v1/admin/academic-video-slots', async () => {
    const mockSlot = {
      id: 'slot-1',
      explanationLanguage: 'en',
      uploadUrl: 'https://s3.mock/upload',
      maxByteSize: 209715200,
      expiresAt: '2026-08-01T00:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSlot,
    });
    vi.stubGlobal('fetch', fetchMock);

    const slot = await api.createVideoUploadSlot('en');
    expect(slot).toEqual(mockSlot);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-video-slots',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-test-token',
        }),
        body: JSON.stringify({ explanationLanguage: 'en' }),
      }),
    );
  });

  test('uploadVideoBytesToSlot writes blob in dev mode and PUTs in remote mode', async () => {
    const devUrl = 'dev://mock-storage/slots/test-slot';
    const blob = new Blob(['sample-bytes'], { type: 'video/mp4' });
    await expect(api.uploadVideoBytesToSlot(devUrl, blob)).resolves.not.toThrow();

    // Remote S3 upload
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await api.uploadVideoBytesToSlot('https://s3.amazonaws.com/bucket/key', blob);
    expect(fetchMock).toHaveBeenCalledWith('https://s3.amazonaws.com/bucket/key', {
      method: 'PUT',
      body: blob,
    });
  });

  test('confirmVideoUpload calls confirm endpoint with provenance', async () => {
    const mockAsset = {
      id: 'vid-1',
      source: 'UPLOADED',
      status: 'DRAFT',
      explanationLanguage: 'en',
      mediaType: 'video/mp4',
      byteSize: 1048576,
      durationSeconds: 120,
      width: 1920,
      height: 1080,
      sha256: 'abc',
      captionsAvailable: true,
      rejection: null,
      latestValidationJob: null,
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        authorUserId: 'user-1',
      },
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAsset,
    });
    vi.stubGlobal('fetch', fetchMock);

    const asset = await api.confirmVideoUpload('slot-1', {
      origin: 'YUKCSCA_ORIGINAL',
    });

    expect(asset).toEqual(mockAsset);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-video-slots/slot-1:confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ provenance: { origin: 'YUKCSCA_ORIGINAL' } }),
      }),
    );
  });

  test('listSceneTemplates returns template registry', async () => {
    const mockRegistry = { version: '1', actions: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRegistry,
    });
    vi.stubGlobal('fetch', fetchMock);

    const reg = await api.listSceneTemplates();
    expect(reg).toEqual(mockRegistry);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/scene-templates',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-test-token',
        }),
      }),
    );
  });

  test('createSceneSpecification and getSceneSpecification call HTTP endpoints', async () => {
    const mockSpec = {
      id: 'spec-1',
      registryVersion: '1',
      explanationLanguage: 'en',
      segments: [],
      latestRenderJob: null,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSpec,
    });
    vi.stubGlobal('fetch', fetchMock);

    const created = await api.createSceneSpecification({
      explanationLanguage: 'en',
      segments: [],
    });
    expect(created).toEqual(mockSpec);

    const fetched = await api.getSceneSpecification('spec-1');
    expect(fetched).toEqual(mockSpec);
  });

  test('createRenderJob and retryAcademicVideoValidation call POST operations', async () => {
    const mockJob = {
      id: 'job-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      sceneSpecificationId: 'spec-1',
      videoAssetId: 'vid-1',
      error: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const job = await api.createRenderJob('spec-1');
    expect(job).toEqual(mockJob);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/render-jobs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sceneSpecificationId: 'spec-1' }),
      }),
    );

    const retryJob = await api.retryAcademicVideoValidation('vid-1');
    expect(retryJob).toEqual(mockJob);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-videos/vid-1:retry-validation',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('getAcademicVideoPlay, captions, and review call operations', async () => {
    const mockGrant = { url: 'https://stream.mock', expiresAt: '2026-08-01T00:00:00Z' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGrant,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'vid-1', status: 'REVIEWED' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const grant = await api.getAcademicVideoPlay('vid-1');
    expect(grant).toEqual(mockGrant);

    const vtt = await api.getAcademicVideoCaptions('vid-1');
    expect(vtt).toContain('WEBVTT');

    const reviewed = await api.reviewAcademicVideo('vid-1');
    expect(reviewed.status).toBe('REVIEWED');
  });
});
