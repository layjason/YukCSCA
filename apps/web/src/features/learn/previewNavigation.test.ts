import { expect, test } from 'vitest';
import { lessonEntryHref, shouldOfferTerminologyPreview } from './previewNavigation';
import type { LessonSummary } from './types';

const progress = {
  status: 'NOT_STARTED' as const,
  resumeBlockIndex: null,
  updatedAt: null,
  updatedSinceCompleted: false,
};

const lesson = (preview?: LessonSummary['terminologyPreview']): LessonSummary => ({
  resourceId: 'lesson-1',
  title: { english: 'Factorisation', indonesian: 'Faktorisasi', simplifiedChinese: '因式分解' },
  outlineItemIds: [],
  contentProgress: progress,
  ...(preview ? { terminologyPreview: preview } : {}),
});

test('unfinished preview intercepts the lesson entry href', () => {
  const href = lessonEntryHref(
    'MATHEMATICS',
    lesson({
      resourceId: 'preview-1',
      progress: {
        status: 'IN_PROGRESS',
        updatedAt: '2026-08-15T00:00:00Z',
        requiredSetUpdatedSinceCompleted: false,
      },
    }),
  );
  expect(href).toBe('/app/learn/MATHEMATICS/terminology/preview-1');
});

test('completed preview keeps the lesson URL', () => {
  expect(
    lessonEntryHref(
      'MATHEMATICS',
      lesson({
        resourceId: 'preview-1',
        progress: {
          status: 'PREVIEW_COMPLETE',
          updatedAt: '2026-08-15T00:00:00Z',
          requiredSetUpdatedSinceCompleted: true,
        },
      }),
    ),
  ).toBe('/app/learn/MATHEMATICS/lessons/lesson-1');
});

test('packages without a term bank never intercept', () => {
  expect(shouldOfferTerminologyPreview(undefined)).toBe(false);
  expect(shouldOfferTerminologyPreview(null)).toBe(false);
  expect(lessonEntryHref('MATHEMATICS', lesson())).toBe('/app/learn/MATHEMATICS/lessons/lesson-1');
});
