import { beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import {
  archiveAcademicPackage,
  createAcademicPackage,
  getAcademicPackage,
  listAcademicPackages,
  publishAcademicPackage,
  saveAcademicPackageDraft,
  uploadAcademicImage,
  ApiError,
} from './academicAdminApi';

describe('academicAdminApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  test('throws authentication required when access token is missing', async () => {
    await expect(listAcademicPackages()).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 401,
    });
  });

  test('listAcademicPackages sends Authorization bearer and returns summaries', async () => {
    setAccessToken('admin-access-token');
    const body = [
      {
        id: '00000000-0000-0000-0000-000000000005',
        subject: 'MATHEMATICS',
        status: 'DRAFT',
        draftRevision: 1,
        activeRevision: null,
        hasUnpublishedChanges: true,
        updatedAt: '2026-07-31T00:00:00Z',
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });
    vi.stubGlobal('fetch', fetchMock);

    const packages = await listAcademicPackages();

    expect(packages).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-packages',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-access-token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  test('createAcademicPackage posts Mathematics subject with bearer token', async () => {
    setAccessToken('admin-access-token');
    const created = {
      id: '00000000-0000-0000-0000-000000000006',
      subject: 'MATHEMATICS',
      status: 'DRAFT',
      draftRevision: 0,
      activeRevision: null,
      hasUnpublishedChanges: false,
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T00:00:00Z',
      draft: {
        officialSyllabus: { subject: 'MATHEMATICS' },
        outlineItems: [],
        learningObjectives: [],
        resources: [],
        questions: [],
        mocks: [],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => created,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAcademicPackage();

    expect(result.id).toBe(created.id);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-packages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-access-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ subject: 'MATHEMATICS' }),
      }),
    );
  });

  test('getAcademicPackage returns package detail', async () => {
    setAccessToken('admin-access-token');
    const pkg = {
      id: '00000000-0000-0000-0000-000000000005',
      subject: 'MATHEMATICS',
      status: 'DRAFT',
      draftRevision: 1,
      activeRevision: null,
      hasUnpublishedChanges: true,
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T00:00:00Z',
      draft: {
        officialSyllabus: { subject: 'MATHEMATICS', authority: 'CSCA' },
        outlineItems: [],
        learningObjectives: [],
        resources: [],
        questions: [],
        mocks: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => pkg,
      }),
    );

    const result = await getAcademicPackage(pkg.id);
    expect(result.draft.officialSyllabus.authority).toBe('CSCA');
  });

  test('saveAcademicPackageDraft returns updated revision flags', async () => {
    setAccessToken('admin-access-token');
    const updated = {
      id: 'pkg-1',
      subject: 'MATHEMATICS',
      status: 'DRAFT',
      draftRevision: 2,
      activeRevision: null,
      hasUnpublishedChanges: true,
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T01:00:00Z',
      draft: {
        officialSyllabus: { subject: 'MATHEMATICS' },
        outlineItems: [],
        learningObjectives: [],
        resources: [],
        questions: [],
        mocks: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => updated,
      }),
    );

    const result = await saveAcademicPackageDraft('pkg-1', 1, {
      officialSyllabus: { subject: 'MATHEMATICS' },
      outlineItems: [],
      learningObjectives: [],
      resources: [],
      questions: [],
      mocks: [],
    });
    expect(result.draftRevision).toBe(2);
    expect(result.hasUnpublishedChanges).toBe(true);
  });

  test('publishAcademicPackage sets published revision summary', async () => {
    setAccessToken('admin-access-token');
    const published = {
      id: 'pkg-1',
      subject: 'MATHEMATICS',
      status: 'PUBLISHED',
      draftRevision: 2,
      hasUnpublishedChanges: false,
      activeRevision: {
        id: 'rev-1',
        revisionNumber: 1,
        publishedAt: '2026-07-31T02:00:00Z',
        publishedByUserId: '00000000-0000-0000-0000-000000000001',
      },
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T02:00:00Z',
      draft: {
        officialSyllabus: { subject: 'MATHEMATICS' },
        outlineItems: [],
        learningObjectives: [],
        resources: [],
        questions: [],
        mocks: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => published,
      }),
    );

    const result = await publishAcademicPackage('pkg-1', 2);
    expect(result.status).toBe('PUBLISHED');
    expect(result.hasUnpublishedChanges).toBe(false);
    expect(result.activeRevision?.revisionNumber).toBe(1);
  });

  test('archiveAcademicPackage sets status to ARCHIVED', async () => {
    setAccessToken('admin-access-token');
    const archived = {
      id: 'pkg-1',
      subject: 'MATHEMATICS',
      status: 'ARCHIVED',
      draftRevision: 2,
      hasUnpublishedChanges: false,
      activeRevision: {
        id: 'rev-1',
        revisionNumber: 1,
        publishedAt: '2026-07-31T02:00:00Z',
        publishedByUserId: '00000000-0000-0000-0000-000000000001',
      },
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T03:00:00Z',
      draft: {
        officialSyllabus: { subject: 'MATHEMATICS' },
        outlineItems: [],
        learningObjectives: [],
        resources: [],
        questions: [],
        mocks: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => archived,
      }),
    );

    const result = await archiveAcademicPackage('pkg-1', 2, 'Superseded by new syllabus');
    expect(result.status).toBe('ARCHIVED');
  });

  test('uploadAcademicImage posts multipart with bearer token', async () => {
    setAccessToken('admin-access-token');
    const image = {
      id: 'img-1',
      mediaType: 'image/png',
      byteSize: 12,
      width: 2,
      height: 2,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        provider: null,
        sourceLocator: null,
        permissionReference: null,
        authorUserId: '00000000-0000-0000-0000-000000000001',
        reviewedByUserId: null,
        reviewedAt: null,
      },
      createdAt: '2026-07-31T00:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => image,
    });
    vi.stubGlobal('fetch', fetchMock);

    const dummyFile = new File(['png-bytes'], 'test.png', { type: 'image/png' });
    const result = await uploadAcademicImage(dummyFile, { origin: 'YUKCSCA_ORIGINAL' });

    expect(result.mediaType).toBe('image/png');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/academic-images',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-access-token',
        }),
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as { body: FormData };
    expect(init.body).toBeInstanceOf(FormData);
  });

  test('surfaces validation problem from failed response', async () => {
    setAccessToken('admin-access-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'ACADEMIC_VALIDATION_FAILED',
          detail: 'Academic content validation failed.',
          violations: [{ path: 'draft.outlineItems', code: 'REQUIRED' }],
        }),
      }),
    );

    await expect(listAcademicPackages()).rejects.toBeInstanceOf(ApiError);
    await expect(listAcademicPackages()).rejects.toMatchObject({
      statusCode: 400,
      problem: expect.objectContaining({ code: 'ACADEMIC_VALIDATION_FAILED' }),
    });
  });
});
