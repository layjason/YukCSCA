import { getAccessToken } from '@/features/auth/authStore';
import type {
  AcademicImage,
  AcademicPackage,
  AcademicPackageDraftInput,
  AcademicPackageSummary,
  AcademicValidationProblem,
  ProvenanceInput,
} from '../types';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly problem?: AcademicValidationProblem | { title?: string; detail?: string },
  ) {
    super(problem?.detail || problem?.title || `HTTP ${statusCode}`);
    this.name = 'ApiError';
  }
}

// Contract-backed initial mock package for DEV mode fallback when backend is offline
const INITIAL_DEV_PACKAGE: AcademicPackage = {
  id: '00000000-0000-0000-0000-000000000005',
  subject: 'MATHEMATICS',
  status: 'DRAFT',
  draftRevision: 1,
  activeRevision: null,
  hasUnpublishedChanges: true,
  createdAt: '2026-07-31T00:00:00Z',
  updatedAt: '2026-07-31T00:00:00Z',
  draft: {
    officialSyllabus: {
      subject: 'MATHEMATICS',
      authority: 'CSCA',
      editionLabel: '2025 Edition',
      sourceLinks: [
        {
          language: 'en',
          url: 'https://csca.cn/files/CSCA%20Mathematics%20Examination%20Syllabus-2025.pdf',
        },
        {
          language: 'zh-CN',
          url: 'https://csca.cn/files/CSCA%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2-%E6%95%B0%E5%AD%A6-2025%E7%89%88.pdf',
        },
      ],
      retrievedAt: '2026-07-31T00:00:00Z',
      lastCheckedAt: '2026-07-31T00:00:00Z',
      publishedOn: { status: 'NOT_STATED', date: null },
      effectiveOn: { status: 'NOT_STATED', date: null },
      updatedOn: { status: 'NOT_STATED', date: null },
      examStructure: {
        durationMinutes: 60,
        totalPoints: 100,
        questionCount: 48,
        questionType: 'SINGLE_ANSWER',
        examLanguages: ['en', 'zh-CN'],
      },
      permittedUse: 'REFERENCE_ONLY',
    },
    outlineItems: [
      {
        id: '10000000-0000-0000-0000-000000000001',
        parentId: null,
        order: 0,
        sourcePosition: { page: 1, section: 'III.1' },
        summary: {
          indonesian: 'Himpunan dan Pertidaksamaan',
          english: 'Sets and Inequalities',
          simplifiedChinese: '集合与不等式',
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        parentId: null,
        order: 1,
        sourcePosition: { page: 1, section: 'III.2' },
        summary: {
          indonesian: 'Fungsi',
          english: 'Functions',
          simplifiedChinese: '函数',
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        parentId: null,
        order: 2,
        sourcePosition: { page: 1, section: 'III.3' },
        summary: {
          indonesian: 'Geometri dan Aljabar',
          english: 'Geometry and Algebra',
          simplifiedChinese: '几何与代数',
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        parentId: null,
        order: 3,
        sourcePosition: { page: 1, section: 'III.4' },
        summary: {
          indonesian: 'Peluang dan Statistika',
          english: 'Probability and Statistics',
          simplifiedChinese: '概率与统计',
        },
      },
    ],
    learningObjectives: [
      {
        id: '20000000-0000-0000-0000-000000000001',
        title: {
          indonesian: 'Menyelesaikan persamaan kuadrat dengan rumus kuadratik dan pemfaktoran.',
          english: 'Solve quadratic equations using the quadratic formula and factoring.',
          simplifiedChinese: '使用二次公式与因式分解求解二次方程。',
        },
        mappings: [
          {
            outlineItemId: '10000000-0000-0000-0000-000000000001',
            rationale: 'Direct alignment with CSCA Mathematics module Sets and Inequalities',
          },
        ],
      },
    ],
    resources: [
      {
        id: '30000000-0000-0000-0000-000000000001',
        kind: 'LESSON',
        title: {
          indonesian: 'Pengantar Persamaan Kuadrat',
          english: 'Introduction to Quadratic Equations',
          simplifiedChinese: '二次方程导论',
        },
        outlineItemIds: ['10000000-0000-0000-0000-000000000001'],
        objectiveIds: ['20000000-0000-0000-0000-000000000001'],
        versions: [
          {
            language: 'en',
            blocks: [
              {
                kind: 'TEXT',
                text: 'A quadratic equation is a second-order polynomial equation in a single variable x with a non-zero coefficient for x^2.',
              },
              {
                kind: 'MATH',
                latex: 'ax^2 + bx + c = 0, \\quad a \\neq 0',
                displayMode: true,
              },
            ],
          },
        ],
        provenance: {
          origin: 'YUKCSCA_ORIGINAL',
          authorUserId: '00000000-0000-0000-0000-000000000001',
          reviewedByUserId: '00000000-0000-0000-0000-000000000001',
          reviewedAt: '2026-07-31T00:00:00Z',
        },
      },
    ],
    questions: [
      {
        id: '40000000-0000-0000-0000-000000000001',
        examLanguage: 'en',
        difficulty: 'STANDARD',
        stem: [
          {
            kind: 'TEXT',
            text: 'Find all real roots of the quadratic equation:',
          },
          {
            kind: 'MATH',
            latex: 'x^2 - 5x + 6 = 0',
            displayMode: true,
          },
        ],
        options: [
          {
            key: 'A',
            blocks: [{ kind: 'TEXT', text: 'x = 2 or x = 3' }],
          },
          {
            key: 'B',
            blocks: [{ kind: 'TEXT', text: 'x = -2 or x = -3' }],
          },
          {
            key: 'C',
            blocks: [{ kind: 'TEXT', text: 'x = 1 or x = 6' }],
          },
          {
            key: 'D',
            blocks: [{ kind: 'TEXT', text: 'x = 0 or x = 5' }],
          },
        ],
        correctOptionKey: 'A',
        explanations: [
          {
            language: 'en',
            blocks: [
              {
                kind: 'TEXT',
                text: 'Factoring the equation gives (x - 2)(x - 3) = 0, so x = 2 or x = 3.',
              },
            ],
          },
        ],
        outlineItemIds: ['10000000-0000-0000-0000-000000000001'],
        objectiveIds: ['20000000-0000-0000-0000-000000000001'],
        provenance: {
          origin: 'YUKCSCA_ORIGINAL',
          authorUserId: '00000000-0000-0000-0000-000000000001',
          reviewedByUserId: '00000000-0000-0000-0000-000000000001',
          reviewedAt: '2026-07-31T00:00:00Z',
        },
      },
    ],
    mocks: [
      {
        id: '50000000-0000-0000-0000-000000000001',
        title: '2025 CSCA Mathematics Full-Length Mock 1',
        examLanguage: 'en',
        durationMinutes: 60,
        totalPoints: 100,
        questionCount: 48,
        questionType: 'SINGLE_ANSWER',
        questions: [
          {
            questionId: '40000000-0000-0000-0000-000000000001',
            points: 2,
          },
        ],
        provenance: {
          origin: 'YUKCSCA_ORIGINAL',
          authorUserId: '00000000-0000-0000-0000-000000000001',
          reviewedByUserId: '00000000-0000-0000-0000-000000000001',
          reviewedAt: '2026-07-31T00:00:00Z',
        },
      },
    ],
  },
};

const memoryDevPackages: AcademicPackage[] = [INITIAL_DEV_PACKAGE];

const isDevFallback = (): boolean => import.meta.env.DEV && import.meta.env.MODE !== 'test';

function authorizationHeaders(includeContentType = true): Record<string, string> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError(401, { title: 'Authentication required' });
  }
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function shouldUseDevFallback(err: unknown): boolean {
  if (!isDevFallback()) return false;
  if (!(err instanceof ApiError)) return true;
  return err.statusCode === 404 || err.statusCode === 401;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let problem: AcademicValidationProblem | { title?: string; detail?: string } | undefined;
    try {
      problem = await res.json();
    } catch {
      // Body not JSON
    }
    throw new ApiError(res.status, problem);
  }
  return res.json() as Promise<T>;
}

export async function listAcademicPackages(): Promise<AcademicPackageSummary[]> {
  try {
    const res = await fetch('/api/v1/admin/academic-packages', {
      headers: authorizationHeaders(false),
    });
    return await handleResponse<AcademicPackageSummary[]>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      return memoryDevPackages.map((pkg) => ({
        id: pkg.id,
        subject: pkg.subject,
        status: pkg.status,
        draftRevision: pkg.draftRevision,
        activeRevision: pkg.activeRevision,
        hasUnpublishedChanges: pkg.hasUnpublishedChanges,
        updatedAt: pkg.updatedAt,
      }));
    }
    throw err;
  }
}

export async function createAcademicPackage(
  subject: AcademicPackage['subject'] = 'MATHEMATICS',
): Promise<AcademicPackage> {
  try {
    const res = await fetch('/api/v1/admin/academic-packages', {
      method: 'POST',
      headers: authorizationHeaders(true),
      body: JSON.stringify({ subject }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const newPkg: AcademicPackage = {
        ...INITIAL_DEV_PACKAGE,
        id: crypto.randomUUID(),
        subject,
        draft: {
          ...INITIAL_DEV_PACKAGE.draft,
          officialSyllabus: {
            ...INITIAL_DEV_PACKAGE.draft.officialSyllabus,
            subject,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryDevPackages.push(newPkg);
      return newPkg;
    }
    throw err;
  }
}

export async function getAcademicPackage(id: string): Promise<AcademicPackage> {
  try {
    const res = await fetch(`/api/v1/admin/academic-packages/${id}`, {
      headers: authorizationHeaders(false),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const found = memoryDevPackages.find((p) => p.id === id) || INITIAL_DEV_PACKAGE;
      return found;
    }
    throw err;
  }
}

export async function saveAcademicPackageDraft(
  id: string,
  expectedDraftRevision: number,
  draft: AcademicPackageDraftInput,
): Promise<AcademicPackage> {
  try {
    const res = await fetch(`/api/v1/admin/academic-packages/${id}/draft`, {
      method: 'PUT',
      headers: authorizationHeaders(true),
      body: JSON.stringify({ expectedDraftRevision, draft }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const index = memoryDevPackages.findIndex((p) => p.id === id);
      const basePkg =
        index >= 0 && memoryDevPackages[index] ? memoryDevPackages[index]! : INITIAL_DEV_PACKAGE;
      const updated: AcademicPackage = {
        ...basePkg,
        draftRevision: basePkg.draftRevision + 1,
        hasUnpublishedChanges: true,
        updatedAt: new Date().toISOString(),
        draft: {
          officialSyllabus: draft.officialSyllabus,
          outlineItems: draft.outlineItems,
          learningObjectives: draft.learningObjectives,
          resources: draft.resources.map((r) => ({
            ...r,
            provenance: {
              ...r.provenance,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: null,
              reviewedAt: null,
            },
          })),
          questions: draft.questions.map((q) => ({
            ...q,
            provenance: {
              ...q.provenance,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: null,
              reviewedAt: null,
            },
          })),
          mocks: draft.mocks.map((m) => ({
            ...m,
            provenance: {
              ...m.provenance,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: null,
              reviewedAt: null,
            },
          })),
          // Preserve VS-009 assessment sets on offline draft save (omit must not wipe).
          assessmentSets: draft.assessmentSets ?? [],
        },
      };
      if (index >= 0) memoryDevPackages[index] = updated;
      return updated;
    }
    throw err;
  }
}

/** Dev-only bytes for uploaded diagrams when the API is offline. */
const memoryDevImageBlobs = new Map<string, Blob>();

/**
 * Uploads one PNG/JPEG diagram.
 * Contract: single-file multipart `POST /api/v1/admin/academic-images`
 * (not multi-file). Multiple diagrams = multiple upload calls + IMAGE blocks.
 */
export async function uploadAcademicImage(
  file: File,
  provenance: ProvenanceInput,
): Promise<AcademicImage> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'provenance',
      new Blob([JSON.stringify(provenance)], { type: 'application/json' }),
    );

    const res = await fetch('/api/v1/admin/academic-images', {
      method: 'POST',
      headers: authorizationHeaders(false),
      body: formData,
    });
    return await handleResponse<AcademicImage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const id = crypto.randomUUID();
      memoryDevImageBlobs.set(id, file);
      return {
        id,
        mediaType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        byteSize: file.size,
        width: 800,
        height: 600,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        provenance: {
          origin: provenance.origin,
          provider: provenance.provider || null,
          sourceLocator: provenance.sourceLocator || null,
          permissionReference: provenance.permissionReference || null,
          authorUserId: '00000000-0000-0000-0000-000000000001',
          reviewedByUserId: '00000000-0000-0000-0000-000000000001',
          reviewedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };
    }
    throw err;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads image bytes with admin auth and returns a data: URL.
 * Prefer data: over blob: so previews work under CSP `img-src` that allows data:
 * (blob: is also allowed in nginx after the CSP update).
 */
export async function fetchAcademicImageObjectUrl(id: string): Promise<string> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError(401, { title: 'Authentication required' });
    }
    const res = await fetch(`/api/v1/admin/academic-images/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'image/png,image/jpeg,image/*',
      },
    });
    if (!res.ok) {
      throw new ApiError(res.status, { title: `Image load failed (${res.status})` });
    }
    const blob = await res.blob();
    return blobToDataUrl(blob);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const stored = memoryDevImageBlobs.get(id);
      if (stored) return blobToDataUrl(stored);
    }
    throw err;
  }
}

/** Local file preview as data: URL (CSP-safe under img-src data:). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

export async function publishAcademicPackage(
  id: string,
  expectedDraftRevision: number,
): Promise<AcademicPackage> {
  try {
    const res = await fetch(`/api/v1/admin/academic-packages/${id}:publish`, {
      method: 'POST',
      headers: authorizationHeaders(true),
      body: JSON.stringify({ expectedDraftRevision }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const index = memoryDevPackages.findIndex((p) => p.id === id);
      const basePkg =
        index >= 0 && memoryDevPackages[index] ? memoryDevPackages[index]! : INITIAL_DEV_PACKAGE;

      const activeRevNum = (basePkg.activeRevision?.revisionNumber || 0) + 1;
      const updated: AcademicPackage = {
        ...basePkg,
        status: 'PUBLISHED',
        hasUnpublishedChanges: false,
        activeRevision: {
          id: crypto.randomUUID(),
          revisionNumber: activeRevNum,
          publishedAt: new Date().toISOString(),
          publishedByUserId: '00000000-0000-0000-0000-000000000001',
        },
        updatedAt: new Date().toISOString(),
      };
      if (index >= 0) memoryDevPackages[index] = updated;
      return updated;
    }
    throw err;
  }
}

export async function archiveAcademicPackage(
  id: string,
  expectedDraftRevision: number,
  reason: string,
): Promise<AcademicPackage> {
  try {
    const res = await fetch(`/api/v1/admin/academic-packages/${id}:archive`, {
      method: 'POST',
      headers: authorizationHeaders(true),
      body: JSON.stringify({ expectedDraftRevision, reason }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (shouldUseDevFallback(err)) {
      const index = memoryDevPackages.findIndex((p) => p.id === id);
      const basePkg =
        index >= 0 && memoryDevPackages[index] ? memoryDevPackages[index]! : INITIAL_DEV_PACKAGE;
      const updated: AcademicPackage = {
        ...basePkg,
        status: 'ARCHIVED',
        updatedAt: new Date().toISOString(),
      };
      if (index >= 0) memoryDevPackages[index] = updated;
      return updated;
    }
    throw err;
  }
}
