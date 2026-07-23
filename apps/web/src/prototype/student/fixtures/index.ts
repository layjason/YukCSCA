import type {
  AccessItem,
  DiagnosticQuestion,
  DiagnosticResult,
  GoalsData,
  LessonContent,
  MistakeRecord,
  MockExamConfig,
  MockQuestion,
  MockResult,
  PlanState,
  PracticeSessionData,
  ProgressWeek,
  SubjectRecommendation,
  SyllabusTopic,
  TodayTask,
} from '../types';

export const sampleGoals: GoalsData = {
  enrollmentYear: '2027',
  examDate: '2027-03-15',
  targetUniversity: 'sample-university-a',
  targetMajor: 'Computer Science',
  programType: 'undergraduate',
  languageOfInstruction: 'en',
  weeklyHours: 6,
  preferredDays: ['mon', 'wed', 'fri'],
  isUndecided: false,
};

export const sampleRecommendations: SubjectRecommendation[] = [
  {
    id: 'math-en',
    name: 'fixture.subjects.mathEnglishName',
    track: 'math-en',
    status: 'explicitly-required',
    reason: 'fixture.subjects.mathEnglishReason',
    examLanguage: 'en',
    confirmed: false,
  },
  {
    id: 'math-zh',
    name: 'fixture.subjects.mathChineseName',
    track: 'math-zh',
    status: 'system-recommended',
    reason: 'fixture.subjects.mathChineseReason',
    examLanguage: 'zh-CN',
    confirmed: false,
  },
];

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: 'diag-1',
    topic: 'Factorisation',
    prompt: 'Factorise completely: 6x² + 9x',
    options: ['3x(2x + 3)', '6x(x + 9)', '3(2x² + 3x)', 'x(6x + 9)'],
    correctIndex: 0,
  },
  {
    id: 'diag-2',
    topic: 'Linear equations',
    prompt: 'Solve for x: 3(x − 2) = 2x + 4',
    options: ['x = 10', 'x = 2', 'x = −2', 'x = 6'],
    correctIndex: 0,
  },
  {
    id: 'diag-3',
    topic: 'Quadratic expressions',
    prompt: 'Expand and simplify: (2x + 1)(x − 3)',
    promptZh: '展开并化简：(2x + 1)(x − 3)',
    pinyin: 'zhǎnkāi bìng huàjiǎn',
    options: ['2x² − 5x − 3', '2x² − 6x − 3', '2x² + 5x − 3', '2x² − 5x + 3'],
    correctIndex: 0,
  },
];

export const diagnosticResult: DiagnosticResult = {
  strengths: [
    {
      topic: 'Linear equations',
      level: 'strong',
      note: 'Correctly isolated the variable with multi-step operations.',
    },
  ],
  gaps: [
    {
      topic: 'Factorisation',
      level: 'gap',
      note: 'Difficulty identifying the greatest common factor.',
    },
    {
      topic: 'Quadratic expressions',
      level: 'developing',
      note: 'Expansion attempted but sign handling needs review.',
    },
  ],
  languageObservation: null,
  insufficientEvidence: ['Indices', 'Coordinate geometry', 'Trigonometry'],
  recommendation:
    'Begin with a factorisation foundation lesson before attempting quadratic practice.',
};

export const samplePlan: PlanState = {
  examDate: '2027-03-15',
  weeksRemaining: 34,
  weeklyHours: 6,
  estimatedWeeklyNeed: 5,
  feasibility: 'on-track',
  riskExplanation: null,
  priorities: ['Factorisation', 'Quadratic expressions', 'Linear equations'],
  firstWeekTasks: [
    {
      id: 'task-1',
      title: 'fixture.tasks.lessonTitle',
      type: 'lesson',
      estimatedMinutes: 12,
      completionRule: 'fixture.tasks.lessonCompletion',
      reason: 'fixture.tasks.lessonReason',
    },
    {
      id: 'task-2',
      title: 'fixture.tasks.practiceTitle',
      type: 'practice',
      estimatedMinutes: 10,
      completionRule: 'fixture.tasks.practiceCompletion',
      reason: 'fixture.tasks.practiceReason',
    },
    {
      id: 'task-3',
      title: 'fixture.tasks.reviewTitle',
      type: 'review',
      estimatedMinutes: 5,
      completionRule: 'fixture.tasks.reviewCompletion',
      reason: 'fixture.tasks.reviewReason',
    },
  ],
  adjustments: [
    {
      id: 'adj-time',
      label: 'fixture.plan.adjustTimeLabel',
      consequence: 'fixture.plan.adjustTimeConsequence',
    },
    {
      id: 'adj-scope',
      label: 'fixture.plan.adjustScopeLabel',
      consequence: 'fixture.plan.adjustScopeConsequence',
    },
    {
      id: 'adj-timing',
      label: 'fixture.plan.adjustTimingLabel',
      consequence: 'fixture.plan.adjustTimingConsequence',
    },
  ],
};

export const sampleLesson: LessonContent = {
  id: 'lesson-factorisation-1',
  title: 'fixture.lesson.title',
  topic: 'Factorisation',
  objective: 'fixture.lesson.objective',
  explanation: 'fixture.lesson.explanation',
  workedExample: 'fixture.lesson.workedExample',
  terminology: [
    {
      term: '公因式',
      pinyin: 'gōng yīn shì',
      definition: 'fixture.terms.gcfDefinition',
      expression: '6x² + 9x → GCF = 3x',
    },
    {
      term: '因式分解',
      pinyin: 'yīn shì fēn jiě',
      definition: 'fixture.terms.factorisationDefinition',
      expression: 'x² − 4 = (x + 2)(x − 2)',
    },
  ],
  checkpointQuestion: 'What is the GCF of 10a²b and 15ab²?',
  checkpointOptions: ['5ab', '5a²b²', '10ab', '15ab'],
  checkpointCorrectIndex: 0,
  summary: 'fixture.lesson.summary',
  assignedPracticeId: 'practice-factorisation-1',
};

export const samplePracticeSession: PracticeSessionData = {
  id: 'practice-factorisation-1',
  topic: 'Factorisation',
  source: 'assigned',
  estimatedMinutes: 10,
  examLanguage: 'en',
  questions: [
    {
      id: 'pq-1',
      topic: 'Factorisation',
      prompt: 'Factorise: 4x + 8',
      options: ['4(x + 2)', '2(2x + 4)', '4x(1 + 8)', '8(x + 4)'],
      correctIndex: 0,
      hints: ['What number divides both 4 and 8?', 'The GCF is 4. Divide each term by 4.'],
      explanationCorrect: '4 divides both terms: 4x ÷ 4 = x, 8 ÷ 4 = 2. So 4x + 8 = 4(x + 2).',
      explanationIncorrect: 'The correct factorisation is 4(x + 2). The GCF of 4 and 8 is 4.',
      likelyCause: 'knowledge-gap',
    },
    {
      id: 'pq-2',
      topic: 'Factorisation',
      prompt: 'Factorise: 6x² − 3x',
      options: ['3x(2x − 1)', '3(2x² − x)', '6x(x − 3)', 'x(6x − 3)'],
      correctIndex: 0,
      hints: [
        'Look at both the coefficients and the variable powers.',
        'GCF of 6 and 3 is 3. GCF of x² and x is x. So GCF = 3x.',
      ],
      explanationCorrect: 'GCF = 3x. Dividing: 6x² ÷ 3x = 2x, 3x ÷ 3x = 1. Result: 3x(2x − 1).',
      explanationIncorrect:
        'The correct answer is 3x(2x − 1). Remember to include the variable in the GCF.',
      likelyCause: 'prerequisite-gap',
    },
    {
      id: 'pq-3',
      topic: 'Factorisation',
      prompt: 'Factorise completely: 12a²b + 8ab²',
      promptZh: '完全因式分解：12a²b + 8ab²',
      options: ['4ab(3a + 2b)', '2ab(6a + 4b)', '4a(3ab + 2b²)', 'ab(12a + 8b)'],
      correctIndex: 0,
      hints: [
        'Find the GCF of the coefficients first: GCF(12, 8) = ?',
        'Now find the GCF of the variable parts: a²b and ab².',
        'GCF = 4ab. Divide each term by 4ab.',
      ],
      explanationCorrect:
        'GCF(12,8) = 4, GCF(a²b, ab²) = ab. Total GCF = 4ab. 12a²b ÷ 4ab = 3a, 8ab² ÷ 4ab = 2b.',
      explanationIncorrect:
        'The answer is 4ab(3a + 2b). The sign changed during simplification — check each division step.',
      likelyCause: 'carelessness',
    },
    {
      id: 'pq-4',
      topic: 'Factorisation',
      prompt: 'Factorise: 5x³ − 10x² + 15x',
      options: ['5x(x² − 2x + 3)', '5(x³ − 2x² + 3x)', 'x(5x² − 10x + 15)', '5x²(x − 2 + 3)'],
      correctIndex: 0,
      hints: [
        'All terms share a factor of 5 and at least one x.',
        'GCF = 5x. Divide each term carefully.',
      ],
      explanationCorrect:
        'GCF = 5x. 5x³ ÷ 5x = x², 10x² ÷ 5x = 2x, 15x ÷ 5x = 3. Result: 5x(x² − 2x + 3).',
      explanationIncorrect:
        'The answer is 5x(x² − 2x + 3). Include all shared variable powers in the GCF.',
      likelyCause: 'knowledge-gap',
    },
  ],
};

export const sampleMistake: MistakeRecord = {
  id: 'mistake-1',
  topic: 'Factorisation',
  questionPrompt: 'Factorise completely: 12a²b + 8ab²',
  attemptedAnswer: '2ab(6a + 4b)',
  correctAnswer: '4ab(3a + 2b)',
  explanation:
    'The equation setup was correct, but the GCF was not fully extracted. 4ab is the greatest common factor, not 2ab.',
  likelyCause: 'carelessness',
  remediationTitle: 'Review: Finding the greatest common factor',
  remediationContent:
    'When finding the GCF, always check: (1) the largest numerical factor, and (2) the lowest power of each shared variable. Practice with 3 more GCF identification exercises.',
  reviewStatus: 'scheduled',
  createdAt: '2026-07-20',
};

export const sampleMockExam: MockExamConfig = {
  id: 'mock-math-en-1',
  title: 'fixture.mock.title',
  examLanguage: 'en',
  estimatedMinutes: 15,
  questionCount: 3,
  syllabusScope: 'fixture.mock.scope',
  status: 'not-started',
};

export const mockQuestions: MockQuestion[] = [
  {
    id: 'mq-1',
    topic: 'Factorisation',
    prompt: 'Factorise: 9x² − 6x',
    options: ['3x(3x − 2)', '3(3x² − 2x)', '9x(x − 6)', 'x(9x − 6)'],
    correctIndex: 0,
  },
  {
    id: 'mq-2',
    topic: 'Linear equations',
    prompt: 'Solve: 5x − 3 = 2x + 9',
    options: ['x = 4', 'x = 2', 'x = 6', 'x = 3'],
    correctIndex: 0,
  },
  {
    id: 'mq-3',
    topic: 'Quadratic expressions',
    prompt: 'Expand: (x + 4)(x − 2)',
    options: ['x² + 2x − 8', 'x² − 2x − 8', 'x² + 2x + 8', 'x² − 6x − 8'],
    correctIndex: 0,
  },
];

export const sampleMockResult: MockResult = {
  answeredCount: 3,
  correctCount: 2,
  topicStrengths: ['Linear equations'],
  topicWeaknesses: ['Quadratic expressions'],
  timeObservation: 'Completed within the estimated time.',
  languageObservation: null,
  remediationRecommendation: 'Review sign handling in binomial expansion before the next practice.',
  priorityChange: 'Quadratic expressions moved up in your plan priority based on this result.',
};

export const sampleProgressWeek: ProgressWeek = {
  tasksCompleted: 4,
  tasksTotal: 6,
  topicsStudied: ['Factorisation', 'Linear equations'],
  mistakesReviewed: 1,
};

export const syllabusTopics: SyllabusTopic[] = [
  {
    id: 'syl-1',
    name: 'fixture.topics.factorisation',
    coverageStatus: 'covered',
    personalStatus: 'in-progress',
  },
  {
    id: 'syl-2',
    name: 'fixture.topics.linearEquations',
    coverageStatus: 'covered',
    personalStatus: 'learned',
  },
  {
    id: 'syl-3',
    name: 'fixture.topics.quadraticExpressions',
    coverageStatus: 'partially-covered',
    personalStatus: 'not-started',
  },
  {
    id: 'syl-4',
    name: 'fixture.topics.indicesSurds',
    coverageStatus: 'planned',
    personalStatus: 'not-started',
  },
  {
    id: 'syl-5',
    name: 'fixture.topics.coordinateGeometry',
    coverageStatus: 'not-covered',
    personalStatus: 'not-started',
  },
  {
    id: 'syl-6',
    name: 'fixture.topics.trigonometry',
    coverageStatus: 'not-covered',
    personalStatus: 'not-started',
  },
];

export const accessItems: AccessItem[] = [
  {
    id: 'access-1',
    name: 'fixture.access.factorisationUnit',
    level: 'available',
    reason: null,
  },
  {
    id: 'access-2',
    name: 'fixture.access.englishFullSyllabus',
    level: 'preview',
    reason: 'fixture.access.englishFullReason',
  },
  {
    id: 'access-3',
    name: 'fixture.access.chineseFullSyllabus',
    level: 'locked',
    reason: 'fixture.access.chineseFullReason',
  },
  {
    id: 'access-4',
    name: 'fixture.access.mockPreview',
    level: 'preview',
    reason: 'fixture.access.mockReason',
  },
  {
    id: 'access-5',
    name: 'fixture.access.completedTrialRecords',
    level: 'exhausted',
    reason: 'fixture.access.exhaustedReason',
  },
];

export const todayTasks: TodayTask[] = [
  {
    id: 'today-1',
    title: 'fixture.tasks.lessonTitle',
    type: 'lesson',
    estimatedMinutes: 12,
    reason: 'fixture.tasks.lessonReason',
    completionRule: 'fixture.tasks.lessonCompletion',
    route: '/app/learn/lesson-factorisation-1',
    completed: false,
  },
  {
    id: 'today-2',
    title: 'fixture.tasks.practiceTitle',
    type: 'practice',
    estimatedMinutes: 10,
    reason: 'fixture.tasks.practiceReason',
    completionRule: 'fixture.tasks.practiceCompletion',
    route: '/app/practice/practice-factorisation-1',
    completed: false,
  },
  {
    id: 'today-3',
    title: 'fixture.tasks.remediationTitle',
    type: 'remediation',
    estimatedMinutes: 5,
    reason: 'fixture.tasks.remediationReason',
    completionRule: 'fixture.tasks.remediationCompletion',
    route: '/app/practice/mistakes/mistake-1',
    completed: false,
  },
];

export function createTodayTasks(): TodayTask[] {
  return todayTasks.map((task) => ({ ...task }));
}

export function createPracticeSessions(): PracticeSessionData[] {
  return [
    {
      ...samplePracticeSession,
      questions: samplePracticeSession.questions.map((question) => ({
        ...question,
        options: [...question.options],
        hints: [...question.hints],
      })),
    },
  ];
}

export function createMockExams(): MockExamConfig[] {
  return [{ ...sampleMockExam }];
}

export function createSeedMistakes(): MistakeRecord[] {
  return [{ ...sampleMistake }];
}
