import type { ExamLanguage, MockPaper, Question } from './types';

export const MOCK_QUESTION_CAPACITY = 48;
export const MOCK_TOTAL_POINTS = 100;

export type MockQuestionSlot = MockPaper['questions'][number];

/** Build mock slots; at full capacity rebalance points to 100 (4×3 + 44×2). */
export function buildMockQuestionSlots(questionIds: readonly string[]): MockQuestionSlot[] {
  const capped = questionIds.slice(0, MOCK_QUESTION_CAPACITY);
  if (capped.length === MOCK_QUESTION_CAPACITY) {
    return capped.map((questionId, index) => ({
      questionId,
      points: index < 4 ? 3 : 2,
    }));
  }
  return capped.map((questionId) => ({ questionId, points: 2 }));
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
): string[] {
  const allowed = new Set(questionsMatchingExamLanguage(questions, examLanguage).map((q) => q.id));
  return selectedIds.filter((id) => allowed.has(id)).slice(0, MOCK_QUESTION_CAPACITY);
}

/** Empty publish-shaped mock shell (title still required non-empty at publish). */
export function createEmptyMockShell(examLanguage: ExamLanguage = 'en'): MockPaper {
  return {
    id: crypto.randomUUID(),
    title: '',
    examLanguage,
    durationMinutes: 60,
    totalPoints: MOCK_TOTAL_POINTS,
    questionCount: MOCK_QUESTION_CAPACITY,
    questionType: 'SINGLE_ANSWER',
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
export function ensureSingleMockShell(mocks: readonly MockPaper[]): MockPaper[] {
  if (mocks.length >= 1) return [mocks[0]!];
  return [createEmptyMockShell()];
}
