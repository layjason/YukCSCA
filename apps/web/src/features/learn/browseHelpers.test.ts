import { expect, test } from 'vitest';
import { findFirstIncompleteLesson, isLessonIncomplete } from './browseHelpers';
import type { LessonSummary, SyllabusOutlineNode } from './types';

function lesson(
  id: string,
  status: LessonSummary['contentProgress']['status'],
  updatedSinceCompleted = false,
): LessonSummary {
  return {
    resourceId: id,
    title: { english: id, indonesian: id, simplifiedChinese: id },
    outlineItemIds: [],
    contentProgress: {
      status,
      resumeBlockIndex: status === 'NOT_STARTED' ? null : 0,
      updatedAt: status === 'NOT_STARTED' ? null : '2026-08-01T00:00:00Z',
      updatedSinceCompleted,
    },
  };
}

test('isLessonIncomplete treats done as complete and updated as incomplete', () => {
  expect(isLessonIncomplete(lesson('a', 'NOT_STARTED'))).toBe(true);
  expect(isLessonIncomplete(lesson('b', 'IN_PROGRESS'))).toBe(true);
  expect(isLessonIncomplete(lesson('c', 'CONTENT_COMPLETE'))).toBe(false);
  expect(isLessonIncomplete(lesson('d', 'CONTENT_COMPLETE', true))).toBe(true);
});

test('findFirstIncompleteLesson returns first not-done in outline order', () => {
  const outline: SyllabusOutlineNode[] = [
    {
      id: 'root',
      parentId: null,
      order: 0,
      summary: { english: 'Root', indonesian: 'Root', simplifiedChinese: 'Root' },
      productCoverage: 'FULLY_COVERED',
      lessons: [lesson('done-1', 'CONTENT_COMPLETE')],
    },
    {
      id: 'child',
      parentId: 'root',
      order: 0,
      summary: { english: 'Child', indonesian: 'Child', simplifiedChinese: 'Child' },
      productCoverage: 'FULLY_COVERED',
      lessons: [
        lesson('done-2', 'CONTENT_COMPLETE'),
        lesson('next', 'NOT_STARTED'),
        lesson('later', 'NOT_STARTED'),
      ],
    },
  ];

  expect(findFirstIncompleteLesson(outline)?.resourceId).toBe('next');
});

test('findFirstIncompleteLesson returns null when all lessons are done', () => {
  const outline: SyllabusOutlineNode[] = [
    {
      id: 'root',
      parentId: null,
      order: 0,
      summary: { english: 'Root', indonesian: 'Root', simplifiedChinese: 'Root' },
      productCoverage: 'FULLY_COVERED',
      lessons: [lesson('only', 'CONTENT_COMPLETE')],
    },
  ];
  expect(findFirstIncompleteLesson(outline)).toBeNull();
});
