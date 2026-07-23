export type OnboardingStep = 'goals' | 'subjects' | 'diagnostic' | 'result' | 'plan' | 'complete';

export type FeasibilityStatus = 'on-track' | 'at-risk' | 'high-risk';

export type SubjectStatus =
  'explicitly-required' | 'system-recommended' | 'pending-confirmation' | 'manually-added';

export type ExamLanguage = 'en' | 'zh-CN';

export type ExplanationLanguage = 'id' | 'en' | 'zh-CN';

export type MistakeCause =
  | 'knowledge-gap'
  | 'prerequisite-gap'
  | 'language-misunderstanding'
  | 'carelessness'
  | 'time-management';

export type PracticeOutcome = 'correct' | 'incorrect';

export type MockExamStatus = 'not-started' | 'in-progress' | 'completed';

export type AccessLevel = 'available' | 'locked' | 'preview' | 'exhausted';

export type CoverageStatus = 'covered' | 'partially-covered' | 'planned' | 'not-covered';

export type PersonalStatus =
  'not-started' | 'in-progress' | 'review-needed' | 'learned' | 'mastered';

export interface GoalsData {
  enrollmentYear: string;
  examDate: string;
  targetUniversity: string | null;
  targetMajor: string;
  programType: string;
  languageOfInstruction: string;
  weeklyHours: number;
  preferredDays: string[];
  isUndecided: boolean;
}

export interface SubjectRecommendation {
  id: string;
  name: string;
  track: 'math-en' | 'math-zh';
  status: SubjectStatus;
  reason: string;
  examLanguage: ExamLanguage;
  confirmed: boolean;
}

export interface DiagnosticQuestion {
  id: string;
  topic: string;
  prompt: string;
  promptZh?: string;
  pinyin?: string;
  options: string[];
  correctIndex: number;
}

export interface DiagnosticResult {
  strengths: TopicEvidence[];
  gaps: TopicEvidence[];
  languageObservation: string | null;
  insufficientEvidence: string[];
  recommendation: string;
}

export interface TopicEvidence {
  topic: string;
  level: 'strong' | 'developing' | 'gap';
  note: string;
}

export interface PlanTask {
  id: string;
  title: string;
  type: 'lesson' | 'practice' | 'review';
  estimatedMinutes: number;
  completionRule: string;
  reason: string;
}

export interface PlanState {
  examDate: string;
  weeksRemaining: number;
  weeklyHours: number;
  estimatedWeeklyNeed: number;
  feasibility: FeasibilityStatus;
  riskExplanation: string | null;
  priorities: string[];
  firstWeekTasks: PlanTask[];
  adjustments: PlanAdjustment[];
}

export interface PlanAdjustment {
  id: string;
  label: string;
  consequence: string;
}

export interface LessonContent {
  id: string;
  title: string;
  topic: string;
  objective: string;
  explanation: string;
  workedExample: string;
  terminology: TerminologyEntry[];
  checkpointQuestion: string;
  checkpointOptions: string[];
  checkpointCorrectIndex: number;
  summary: string;
  assignedPracticeId: string;
}

export interface TerminologyEntry {
  term: string;
  pinyin: string;
  definition: string;
  expression: string;
}

export interface PracticeQuestion {
  id: string;
  topic: string;
  prompt: string;
  promptZh?: string;
  options: string[];
  correctIndex: number;
  hints: string[];
  explanationCorrect: string;
  explanationIncorrect: string;
  likelyCause: MistakeCause;
}

export interface PracticeSessionData {
  id: string;
  topic: string;
  source: 'assigned' | 'topic-selected';
  questions: PracticeQuestion[];
  estimatedMinutes: number;
  examLanguage: ExamLanguage;
}

export interface MistakeRecord {
  id: string;
  topic: string;
  questionPrompt: string;
  attemptedAnswer: string;
  correctAnswer: string;
  explanation: string;
  likelyCause: MistakeCause;
  remediationTitle: string;
  remediationContent: string;
  reviewStatus: 'pending' | 'scheduled' | 'completed';
  createdAt: string;
}

export interface MockExamConfig {
  id: string;
  title: string;
  examLanguage: ExamLanguage;
  estimatedMinutes: number;
  questionCount: number;
  syllabusScope: string;
  status: MockExamStatus;
}

export interface MockQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface MockResult {
  answeredCount: number;
  correctCount: number;
  topicStrengths: string[];
  topicWeaknesses: string[];
  timeObservation: string;
  languageObservation: string | null;
  remediationRecommendation: string;
  priorityChange: string;
}

export interface ProgressWeek {
  tasksCompleted: number;
  tasksTotal: number;
  topicsStudied: string[];
  mistakesReviewed: number;
}

export interface SyllabusTopic {
  id: string;
  name: string;
  coverageStatus: CoverageStatus;
  personalStatus: PersonalStatus;
}

export interface AccessItem {
  id: string;
  name: string;
  level: AccessLevel;
  reason: string | null;
}

export interface TodayTask {
  id: string;
  title: string;
  type: 'lesson' | 'practice' | 'review' | 'remediation';
  estimatedMinutes: number;
  reason: string;
  completionRule: string;
  route: string;
  completed: boolean;
}
