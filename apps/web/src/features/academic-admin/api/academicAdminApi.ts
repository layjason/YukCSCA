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
      sourceUrl: 'https://csca.org.cn/syllabus-2025.pdf',
      sourceLanguages: ['en', 'zh-CN'],
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
        order: 1,
        sourcePosition: { page: 3, section: '1.1' },
        summary: {
          indonesian: 'Aljabar dan Fungsi: Persamaan Kuadrat dan Pertidaksamaan',
          english: 'Algebra and Functions: Quadratic Equations and Inequalities',
          simplifiedChinese: '代数与函数：二次方程与不等式',
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        parentId: '10000000-0000-0000-0000-000000000001',
        order: 2,
        sourcePosition: { page: 5, section: '1.2' },
        summary: {
          indonesian: 'Trigonometri: Identitas dan Persamaan Trigonometri',
          english: 'Trigonometry: Identities and Trigonometric Equations',
          simplifiedChinese: '三角学：恒等式与三角方程',
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
            rationale: 'Direct alignment with CSCA Mathematics Section 1.1',
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
      headers: { Accept: 'application/json' },
    });
    return await handleResponse<AcademicPackageSummary[]>(res);
  } catch (err) {
    if (
      import.meta.env.DEV &&
      ((err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 401)) ||
        !(err instanceof ApiError))
    ) {
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

export async function createAcademicPackage(): Promise<AcademicPackage> {
  try {
    const res = await fetch('/api/v1/admin/academic-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subject: 'MATHEMATICS' }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
      const newPkg: AcademicPackage = {
        ...INITIAL_DEV_PACKAGE,
        id: crypto.randomUUID(),
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
      headers: { Accept: 'application/json' },
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ expectedDraftRevision, draft }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
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
              reviewedByUserId: '00000000-0000-0000-0000-000000000001',
              reviewedAt: new Date().toISOString(),
            },
          })),
          questions: draft.questions.map((q) => ({
            ...q,
            provenance: {
              ...q.provenance,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: '00000000-0000-0000-0000-000000000001',
              reviewedAt: new Date().toISOString(),
            },
          })),
          mocks: draft.mocks.map((m) => ({
            ...m,
            provenance: {
              ...m.provenance,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: '00000000-0000-0000-0000-000000000001',
              reviewedAt: new Date().toISOString(),
            },
          })),
        },
      };
      if (index >= 0) memoryDevPackages[index] = updated;
      return updated;
    }
    throw err;
  }
}

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
      body: formData,
    });
    return await handleResponse<AcademicImage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
      return {
        id: crypto.randomUUID(),
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

export async function publishAcademicPackage(
  id: string,
  expectedDraftRevision: number,
): Promise<AcademicPackage> {
  try {
    const res = await fetch(`/api/v1/admin/academic-packages/${id}:publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ expectedDraftRevision }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ expectedDraftRevision, reason }),
    });
    return await handleResponse<AcademicPackage>(res);
  } catch (err) {
    if (import.meta.env.DEV && !(err instanceof ApiError && err.statusCode >= 500)) {
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
