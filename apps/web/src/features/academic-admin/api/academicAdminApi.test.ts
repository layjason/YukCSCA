import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  listAcademicPackages,
  createAcademicPackage,
  getAcademicPackage,
  saveAcademicPackageDraft,
  publishAcademicPackage,
  archiveAcademicPackage,
  uploadAcademicImage,
} from './academicAdminApi';

describe('academicAdminApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('listAcademicPackages returns fallback package summaries in DEV mode when offline/404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const packages = await listAcademicPackages();
    expect(packages.length).toBeGreaterThan(0);
    expect(packages[0]?.subject).toBe('MATHEMATICS');
  });

  test('createAcademicPackage returns new package instance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const created = await createAcademicPackage();
    expect(created.id).toBeDefined();
    expect(created.subject).toBe('MATHEMATICS');
    expect(created.status).toBe('DRAFT');
  });

  test('getAcademicPackage returns requested package detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const pkg = await getAcademicPackage('00000000-0000-0000-0000-000000000005');
    expect(pkg).toBeDefined();
    expect(pkg.draft.officialSyllabus.authority).toBe('CSCA');
  });

  test('saveAcademicPackageDraft increments draft revision and sets hasUnpublishedChanges', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const pkg = await getAcademicPackage('00000000-0000-0000-0000-000000000005');
    const updated = await saveAcademicPackageDraft(pkg.id, pkg.draftRevision, {
      officialSyllabus: pkg.draft.officialSyllabus,
      outlineItems: pkg.draft.outlineItems,
      learningObjectives: pkg.draft.learningObjectives,
      resources: [],
      questions: [],
      mocks: [],
    });
    expect(updated.draftRevision).toBe(pkg.draftRevision + 1);
    expect(updated.hasUnpublishedChanges).toBe(true);
  });

  test('publishAcademicPackage sets status to PUBLISHED and updates activeRevision', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const pkg = await getAcademicPackage('00000000-0000-0000-0000-000000000005');
    const published = await publishAcademicPackage(pkg.id, pkg.draftRevision);
    expect(published.status).toBe('PUBLISHED');
    expect(published.hasUnpublishedChanges).toBe(false);
    expect(published.activeRevision).toBeDefined();
  });

  test('archiveAcademicPackage sets status to ARCHIVED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const pkg = await getAcademicPackage('00000000-0000-0000-0000-000000000005');
    const archived = await archiveAcademicPackage(
      pkg.id,
      pkg.draftRevision,
      'Superseded by new syllabus',
    );
    expect(archived.status).toBe('ARCHIVED');
  });

  test('uploadAcademicImage returns AcademicImage record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const dummyFile = new File(['png-bytes'], 'test.png', { type: 'image/png' });
    const image = await uploadAcademicImage(dummyFile, { origin: 'YUKCSCA_ORIGINAL' });
    expect(image.id).toBeDefined();
    expect(image.mediaType).toBe('image/png');
  });
});
