import {
  createMockExams,
  createPracticeSessions,
  createSeedMistakes,
  createTodayTasks,
  sampleGoals,
  samplePlan,
  sampleRecommendations,
} from './fixtures';
import { initialPrototypeState, type PrototypeState } from './prototypeState';

export type ScenarioId =
  | 'new-student'
  | 'active-plan'
  | 'high-risk'
  | 'loading'
  | 'empty'
  | 'recoverable-error'
  | 'practice-correct'
  | 'practice-incorrect'
  | 'practice-submit-error'
  | 'mock-not-started'
  | 'mock-in-progress'
  | 'mock-completed'
  | 'access-restricted'
  | 'state-lost'
  | 'unsupported-role';

export function createScenarioState(
  scenario: ScenarioId,
  overrides?: Partial<PrototypeState>,
): PrototypeState {
  const base: PrototypeState = {
    ...initialPrototypeState,
    diagnosticAnswers: {},
    practiceAnswers: {},
    practiceSubmitted: {},
    mistakes: [],
    mockAnswers: {},
    mockMarkedForReview: {},
    remediationCompleted: [],
  };

  const activePlan: PrototypeState = {
    ...base,
    onboardingStep: 'complete',
    goals: { ...sampleGoals },
    subjects: sampleRecommendations.map((subject) => ({ ...subject, confirmed: true })),
    diagnosticAnswers: { 'diag-1': 0, 'diag-2': 0, 'diag-3': 1 },
    diagnosticSubmitted: true,
    plan: {
      ...samplePlan,
      priorities: [...samplePlan.priorities],
      firstWeekTasks: samplePlan.firstWeekTasks.map((task) => ({ ...task })),
      adjustments: samplePlan.adjustments.map((adjustment) => ({ ...adjustment })),
    },
    planConfirmed: true,
    todayTasks: createTodayTasks(),
    practiceSessions: createPracticeSessions(),
    mistakes: createSeedMistakes(),
    mockExams: createMockExams(),
  };

  let state: PrototypeState;

  switch (scenario) {
    case 'active-plan':
    case 'practice-correct':
    case 'mock-not-started':
      state = activePlan;
      break;
    case 'high-risk':
      state = {
        ...activePlan,
        plan: activePlan.plan
          ? {
              ...activePlan.plan,
              weeklyHours: 3,
              estimatedWeeklyNeed: 8,
              feasibility: 'high-risk',
              riskExplanation: 'fixture.plan.highRiskReason',
            }
          : null,
      };
      break;
    case 'loading':
      state = { ...activePlan, loading: true };
      break;
    case 'empty':
      state = {
        ...activePlan,
        todayTasks: [],
        practiceSessions: [],
        mistakes: [],
        mockExams: [],
      };
      break;
    case 'recoverable-error':
      state = { ...activePlan, error: 'preview_error.recoverable' };
      break;
    case 'practice-incorrect':
      state = {
        ...activePlan,
        practiceAnswers: { 'pq-1': 1 },
        practiceSubmitted: { 'practice-factorisation-1': true },
      };
      break;
    case 'practice-submit-error':
      state = { ...activePlan, practiceSubmitFailuresRemaining: 1 };
      break;
    case 'mock-in-progress':
      state = {
        ...activePlan,
        mockExams: activePlan.mockExams.map((exam) => ({ ...exam, status: 'in-progress' })),
        mockAnswers: { 'mq-1': 0 },
        mockInterrupted: true,
      };
      break;
    case 'mock-completed':
      state = {
        ...activePlan,
        mockExams: activePlan.mockExams.map((exam) => ({ ...exam, status: 'completed' })),
        mockAnswers: { 'mq-1': 0, 'mq-2': 0, 'mq-3': 1 },
        mockSubmitted: true,
      };
      break;
    case 'access-restricted':
      state = activePlan;
      break;
    case 'state-lost':
    case 'unsupported-role':
    case 'new-student':
    default:
      state = base;
      break;
  }

  return { ...state, ...overrides };
}
