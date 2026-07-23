import {
  createMockExams,
  createPracticeSessions,
  createSeedMistakes,
  createTodayTasks,
} from './fixtures';
import type {
  ExplanationLanguage,
  GoalsData,
  MistakeRecord,
  MockExamConfig,
  OnboardingStep,
  PlanState,
  PracticeSessionData,
  SubjectRecommendation,
  TodayTask,
} from './types';

export interface PrototypeState {
  onboardingStep: OnboardingStep;
  goals: GoalsData | null;
  subjects: SubjectRecommendation[] | null;
  diagnosticAnswers: Record<string, number>;
  diagnosticSubmitted: boolean;
  plan: PlanState | null;
  planConfirmed: boolean;
  todayTasks: TodayTask[];
  practiceSessions: PracticeSessionData[];
  practiceAnswers: Record<string, number>;
  practiceSubmitted: Record<string, boolean>;
  practiceSubmitFailuresRemaining: number;
  mistakes: MistakeRecord[];
  mockExams: MockExamConfig[];
  mockAnswers: Record<string, number>;
  mockMarkedForReview: Record<string, boolean>;
  mockSubmitted: boolean;
  mockInterrupted: boolean;
  priorityChangeApproved: boolean;
  remediationCompleted: string[];
  defaultExplanationLanguage: ExplanationLanguage;
  temporaryExplanationLanguage: ExplanationLanguage | null;
  loading: boolean;
  error: string | null;
}

export type PrototypeAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'COMPLETE_GOALS'; goals: GoalsData }
  | { type: 'CONFIRM_SUBJECTS'; subjects: SubjectRecommendation[] }
  | { type: 'SET_DIAGNOSTIC_ANSWER'; questionId: string; answerIndex: number }
  | { type: 'SUBMIT_DIAGNOSTIC' }
  | { type: 'SET_PLAN'; plan: PlanState }
  | { type: 'CONFIRM_PLAN' }
  | { type: 'COMPLETE_TODAY_TASK'; taskId: string }
  | { type: 'SET_PRACTICE_ANSWER'; questionId: string; answerIndex: number }
  | { type: 'SUBMIT_PRACTICE'; sessionId: string }
  | { type: 'CONSUME_PRACTICE_FAILURE' }
  | { type: 'ADD_MISTAKE'; mistake: MistakeRecord }
  | { type: 'COMPLETE_REMEDIATION'; mistakeId: string }
  | { type: 'SET_MOCK_ANSWER'; questionId: string; answerIndex: number }
  | { type: 'TOGGLE_MOCK_REVIEW'; questionId: string }
  | { type: 'SUBMIT_MOCK' }
  | { type: 'START_MOCK'; examId: string }
  | { type: 'INTERRUPT_MOCK' }
  | { type: 'RESUME_MOCK' }
  | { type: 'APPROVE_PRIORITY_CHANGE' }
  | { type: 'SET_TEMP_EXPLANATION_LANGUAGE'; language: ExplanationLanguage | null }
  | { type: 'RESET' };

export const initialPrototypeState: PrototypeState = {
  onboardingStep: 'goals',
  goals: null,
  subjects: null,
  diagnosticAnswers: {},
  diagnosticSubmitted: false,
  plan: null,
  planConfirmed: false,
  todayTasks: [],
  practiceSessions: [],
  practiceAnswers: {},
  practiceSubmitted: {},
  practiceSubmitFailuresRemaining: 0,
  mistakes: [],
  mockExams: [],
  mockAnswers: {},
  mockMarkedForReview: {},
  mockSubmitted: false,
  mockInterrupted: false,
  priorityChangeApproved: false,
  remediationCompleted: [],
  defaultExplanationLanguage: 'id',
  temporaryExplanationLanguage: null,
  loading: false,
  error: null,
};

export function prototypeReducer(state: PrototypeState, action: PrototypeAction): PrototypeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'COMPLETE_GOALS':
      return { ...state, goals: action.goals, onboardingStep: 'subjects' };
    case 'CONFIRM_SUBJECTS':
      return { ...state, subjects: action.subjects, onboardingStep: 'diagnostic' };
    case 'SET_DIAGNOSTIC_ANSWER':
      return {
        ...state,
        diagnosticAnswers: {
          ...state.diagnosticAnswers,
          [action.questionId]: action.answerIndex,
        },
      };
    case 'SUBMIT_DIAGNOSTIC':
      return { ...state, diagnosticSubmitted: true, onboardingStep: 'result' };
    case 'SET_PLAN':
      return { ...state, plan: action.plan, onboardingStep: 'plan' };
    case 'CONFIRM_PLAN':
      return {
        ...state,
        planConfirmed: true,
        onboardingStep: 'complete',
        todayTasks: createTodayTasks(),
        practiceSessions: createPracticeSessions(),
        mistakes: createSeedMistakes(),
        mockExams: createMockExams(),
      };
    case 'COMPLETE_TODAY_TASK':
      return {
        ...state,
        todayTasks: state.todayTasks.map((task) =>
          task.id === action.taskId ? { ...task, completed: true } : task,
        ),
      };
    case 'SET_PRACTICE_ANSWER':
      return {
        ...state,
        practiceAnswers: {
          ...state.practiceAnswers,
          [action.questionId]: action.answerIndex,
        },
      };
    case 'SUBMIT_PRACTICE':
      return {
        ...state,
        practiceSubmitted: {
          ...state.practiceSubmitted,
          [action.sessionId]: true,
        },
      };
    case 'CONSUME_PRACTICE_FAILURE':
      return {
        ...state,
        practiceSubmitFailuresRemaining: Math.max(0, state.practiceSubmitFailuresRemaining - 1),
      };
    case 'ADD_MISTAKE':
      return {
        ...state,
        mistakes: state.mistakes.some((mistake) => mistake.id === action.mistake.id)
          ? state.mistakes.map((mistake) =>
              mistake.id === action.mistake.id ? action.mistake : mistake,
            )
          : [...state.mistakes, action.mistake],
      };
    case 'COMPLETE_REMEDIATION':
      return {
        ...state,
        remediationCompleted: state.remediationCompleted.includes(action.mistakeId)
          ? state.remediationCompleted
          : [...state.remediationCompleted, action.mistakeId],
        mistakes: state.mistakes.map((mistake) =>
          mistake.id === action.mistakeId
            ? { ...mistake, reviewStatus: 'completed' as const }
            : mistake,
        ),
      };
    case 'SET_MOCK_ANSWER':
      return {
        ...state,
        mockAnswers: {
          ...state.mockAnswers,
          [action.questionId]: action.answerIndex,
        },
      };
    case 'TOGGLE_MOCK_REVIEW':
      return {
        ...state,
        mockMarkedForReview: {
          ...state.mockMarkedForReview,
          [action.questionId]: !state.mockMarkedForReview[action.questionId],
        },
      };
    case 'SUBMIT_MOCK':
      if (state.mockSubmitted) return state;
      return {
        ...state,
        mockSubmitted: true,
        mockInterrupted: false,
        mockExams: state.mockExams.map((exam) => ({
          ...exam,
          status: 'completed' as const,
        })),
      };
    case 'START_MOCK':
      return {
        ...state,
        mockExams: state.mockExams.map((exam) =>
          exam.id === action.examId ? { ...exam, status: 'in-progress' as const } : exam,
        ),
      };
    case 'INTERRUPT_MOCK':
      return { ...state, mockInterrupted: true };
    case 'RESUME_MOCK':
      return { ...state, mockInterrupted: false };
    case 'APPROVE_PRIORITY_CHANGE':
      return { ...state, priorityChangeApproved: true };
    case 'SET_TEMP_EXPLANATION_LANGUAGE':
      return { ...state, temporaryExplanationLanguage: action.language };
    case 'RESET':
      return initialPrototypeState;
    default:
      return state;
  }
}
