import type {
  ContentProgress,
  ExplanationLanguage,
  PublishedLessonDetail,
  PublishedPackageBrowse,
  PublishedPackageSummary,
} from '../types';

const PACKAGE_ID = '00000000-0000-4000-8000-0000000000a1';
const REVISION_ID = '00000000-0000-4000-8000-0000000000a2';
const OUTLINE_ROOT = '00000000-0000-4000-8000-0000000000b1';
const OUTLINE_CHILD = '00000000-0000-4000-8000-0000000000b2';
const LESSON_ID = '00000000-0000-4000-8000-0000000000c1';
const IMAGE_ID = '00000000-0000-4000-8000-0000000000d1';

/** In-memory progress for DEV offline fallback only — never production persistence. */
const progressByResource = new Map<string, ContentProgress>();

function defaultProgress(): ContentProgress {
  return { status: 'NOT_STARTED', resumeBlockIndex: null, updatedAt: null };
}

function getProgress(resourceId: string): ContentProgress {
  return progressByResource.get(resourceId) ?? defaultProgress();
}

export function devListPublishedPackages(): PublishedPackageSummary[] {
  return [
    {
      id: PACKAGE_ID,
      subject: 'MATHEMATICS',
      activeRevision: {
        id: REVISION_ID,
        revisionNumber: 1,
        publishedAt: '2026-08-01T00:00:00Z',
      },
      examLanguages: ['en', 'zh-CN'],
    },
  ];
}

export function devGetPublishedPackageBrowse(subject: string): PublishedPackageBrowse | null {
  if (subject !== 'MATHEMATICS') return null;
  const progress = getProgress(LESSON_ID);
  const lesson = {
    resourceId: LESSON_ID,
    title: {
      indonesian: 'Faktorisasi polinomial',
      english: 'Polynomial factorisation',
      simplifiedChinese: '多项式因式分解',
    },
    outlineItemIds: [OUTLINE_CHILD],
    contentProgress: progress,
  };

  const packages = devListPublishedPackages();
  const published = packages[0];
  if (!published) return null;

  return {
    package: published,
    officialSource: {
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
      lastCheckedAt: '2026-08-01T00:00:00Z',
      publishedOn: { status: 'DECLARED', date: '2025-01-01' },
      effectiveOn: { status: 'NOT_STATED', date: null },
      updatedOn: { status: 'NOT_STATED', date: null },
      permittedUse: 'REFERENCE_ONLY',
    },
    outline: [
      {
        id: OUTLINE_ROOT,
        parentId: null,
        order: 0,
        summary: {
          indonesian: 'Aljabar',
          english: 'Algebra',
          simplifiedChinese: '代数',
        },
        productCoverage: 'PARTIALLY_COVERED',
        lessons: [],
      },
      {
        id: OUTLINE_CHILD,
        parentId: OUTLINE_ROOT,
        order: 0,
        summary: {
          indonesian: 'Faktorisasi',
          english: 'Factorisation',
          simplifiedChinese: '因式分解',
        },
        productCoverage: 'FULLY_COVERED',
        lessons: [lesson],
      },
      {
        id: '00000000-0000-4000-8000-0000000000b3',
        parentId: null,
        order: 1,
        summary: {
          indonesian: 'Fungsi',
          english: 'Functions',
          simplifiedChinese: '函数',
        },
        productCoverage: 'NOT_COVERED',
        lessons: [],
      },
    ],
    continueLesson: progress.status === 'IN_PROGRESS' ? lesson : null,
  };
}

export function devGetPublishedLesson(
  subject: string,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): PublishedLessonDetail | null {
  if (subject !== 'MATHEMATICS' || resourceId !== LESSON_ID) return null;

  const available: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];
  const progress = getProgress(resourceId);

  if (!available.includes(explanationLanguage)) {
    return {
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      subject: 'MATHEMATICS',
      resourceId: LESSON_ID,
      title: {
        indonesian: 'Faktorisasi polinomial',
        english: 'Polynomial factorisation',
        simplifiedChinese: '多项式因式分解',
      },
      availableExplanationLanguages: available,
      requestedExplanationLanguage: explanationLanguage,
      body: {
        availability: 'LANGUAGE_UNAVAILABLE',
        requestedLanguage: explanationLanguage,
      },
      contentProgress: progress,
    };
  }

  const blocksByLang: Record<ExplanationLanguage, PublishedLessonDetail['body']> = {
    id: {
      availability: 'AVAILABLE',
      blocks: [
        {
          kind: 'TEXT',
          text: 'Faktorisasi adalah menulis polinomial sebagai hasil kali faktor yang lebih sederhana.',
        },
        { kind: 'MATH', latex: 'x^2 - 5x + 6 = (x-2)(x-3)', displayMode: true },
        {
          kind: 'TEXT',
          text: 'Periksa dengan mengalikan kembali kedua faktor.',
        },
        {
          kind: 'IMAGE',
          imageId: IMAGE_ID,
          altText: 'Diagram faktorisasi contoh',
          caption: 'Contoh diagram (pratinjau lokal)',
        },
      ],
    },
    en: {
      availability: 'AVAILABLE',
      blocks: [
        {
          kind: 'TEXT',
          text: 'Factorisation rewrites a polynomial as a product of simpler factors.',
        },
        { kind: 'MATH', latex: 'x^2 - 5x + 6 = (x-2)(x-3)', displayMode: true },
        {
          kind: 'TEXT',
          text: 'Check by expanding the factors again.',
        },
        {
          kind: 'IMAGE',
          imageId: IMAGE_ID,
          altText: 'Sample factorisation diagram',
          caption: 'Sample diagram (local preview)',
        },
      ],
    },
    'zh-CN': {
      availability: 'AVAILABLE',
      blocks: [
        {
          kind: 'TEXT',
          text: '因式分解是把多项式写成更简单因式的乘积。',
        },
        { kind: 'MATH', latex: 'x^2 - 5x + 6 = (x-2)(x-3)', displayMode: true },
        {
          kind: 'TEXT',
          text: '展开因式可以检验结果。',
        },
        {
          kind: 'IMAGE',
          imageId: IMAGE_ID,
          altText: '因式分解示例图',
          caption: '示例图（本地预览）',
        },
      ],
    },
  };

  return {
    packageId: PACKAGE_ID,
    packageRevisionId: REVISION_ID,
    subject: 'MATHEMATICS',
    resourceId: LESSON_ID,
    title: {
      indonesian: 'Faktorisasi polinomial',
      english: 'Polynomial factorisation',
      simplifiedChinese: '多项式因式分解',
    },
    availableExplanationLanguages: available,
    requestedExplanationLanguage: explanationLanguage,
    body: blocksByLang[explanationLanguage],
    contentProgress: progress,
  };
}

export function devUpsertContentProgress(
  subject: string,
  resourceId: string,
  status: 'IN_PROGRESS' | 'CONTENT_COMPLETE',
  resumeBlockIndex?: number | null,
): ContentProgress | null {
  if (subject !== 'MATHEMATICS' || resourceId !== LESSON_ID) return null;
  const next: ContentProgress = {
    status,
    resumeBlockIndex:
      status === 'CONTENT_COMPLETE'
        ? (resumeBlockIndex ?? getProgress(resourceId).resumeBlockIndex)
        : (resumeBlockIndex ?? 0),
    updatedAt: new Date().toISOString(),
  };
  progressByResource.set(resourceId, next);
  return next;
}

export function devLessonResourceId(): string {
  return LESSON_ID;
}

/** Tiny transparent PNG for DEV image fallback (1×1). */
export function devImagePlaceholderBlob(): Blob {
  const bytes = Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    ),
    (c) => c.charCodeAt(0),
  );
  return new Blob([bytes], { type: 'image/png' });
}
