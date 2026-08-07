import type { ExamLanguage, MockPaper, Question } from './types';
import { defaultExamStructure } from './subjectProfile';

export type MockQuestionSlot = MockPaper['questions'][number];

/**
 * Distribute totalPoints across selected slots as evenly as possible when full.
 * For Math 48/100 this yields 4×3 + 44×2 (same as the prior fixed rule).
 */
export function buildMockQuestionSlots(
  questionIds: readonly string[],
  capacity: number,
  totalPoints: number,
): MockQuestionSlot[] {
  const capped = questionIds.slice(0, Math.max(0, capacity));
  if (capped.length === 0) return [];

  if (capped.length === capacity && capacity > 0) {
    const base = Math.floor(totalPoints / capacity);
    let remainder = totalPoints - base * capacity;
    return capped.map((questionId) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { questionId, points: Math.max(1, base + extra) };
    });
  }

  const partialBase = Math.max(1, Math.floor(totalPoints / Math.max(capacity, 1)));
  return capped.map((questionId) => ({ questionId, points: partialBase }));
}

export function sumMockPoints(slots: readonly MockQuestionSlot[]): number {
  return slots.reduce((sum, item) => sum + (item.points ?? 0), 0);
}

/** Questions eligible for a mock exam language (backend INCOMPATIBLE otherwise). */
export function questionsMatchingExamLanguage(
  questions: readonly Question[],
  examLanguage: ExamLanguage | undefined,
): Question[] {
  if (!examLanguage) return [];
  return questions.filter((q) => (q.examLanguage || 'en') === examLanguage);
}

/**
 * Keep only selected question ids that still match the mock language and capacity.
 * Preserves relative order of surviving selections.
 */
export function filterMockSelectionForLanguage(
  selectedIds: readonly string[],
  questions: readonly Question[],
  examLanguage: ExamLanguage | undefined,
  capacity: number,
): string[] {
  const allowed = new Set(questionsMatchingExamLanguage(questions, examLanguage).map((q) => q.id));
  return selectedIds.filter((id) => allowed.has(id)).slice(0, capacity);
}

/** Empty publish-shaped mock shell from the package exam structure (or subject defaults). */
export function createEmptyMockShell(
  examLanguage: ExamLanguage = 'en',
  structure: {
    durationMinutes: number;
    totalPoints: number;
    questionCount: number;
    questionType: 'SINGLE_ANSWER';
  } = defaultExamStructure('MATHEMATICS'),
): MockPaper {
  return {
    id: crypto.randomUUID(),
    title: '',
    examLanguage,
    durationMinutes: structure.durationMinutes,
    totalPoints: structure.totalPoints,
    questionCount: structure.questionCount,
    questionType: structure.questionType,
    questions: [],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: null,
      reviewedAt: null,
    },
  };
}

/**
 * Ensure draft has exactly one mock for editor work. Returns the mocks array
 * (unchanged if already length 1, extended if empty). Never returns >1.
 */
export function ensureSingleMockShell(
  mocks: readonly MockPaper[],
  structure?: {
    durationMinutes: number;
    totalPoints: number;
    questionCount: number;
    questionType: 'SINGLE_ANSWER';
  },
): MockPaper[] {
  if (mocks.length >= 1) return [mocks[0]!];
  return [createEmptyMockShell('en', structure ?? defaultExamStructure('MATHEMATICS'))];
}
