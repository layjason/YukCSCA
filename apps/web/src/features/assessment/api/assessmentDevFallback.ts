import { anyAssistanceUsed } from '../assessmentPolicy';
import type {
  AcademicSubject,
  AssessmentSession,
  AssessmentSessionResumeSummary,
  AssessmentSetSummary,
  CheckpointForLesson,
  DiscloseHintResult,
  ExplanationLanguage,
  ItemAnswerResult,
  MistakeDetail,
  MistakeListResponseBody,
  MistakeStatus,
  PublishedRemediationDetail,
  SessionItemView,
  SessionResult,
  StartAssessmentSessionRequest,
  ContentProgress,
  UpdateMistakeAnnotationRequest,
} from '../types';

const PACKAGE_ID = '00000000-0000-4000-8000-0000000000a1';
const REVISION_ID = '00000000-0000-4000-8000-0000000000a2';
const LESSON_ID = '00000000-0000-4000-8000-0000000000c1';
const SET_CHECKPOINT = '00000000-0000-4000-8000-0000000000e1';
const SET_TOPIC = '00000000-0000-4000-8000-0000000000e2';
const Q1 = '00000000-0000-4000-8000-0000000000f1';
const Q2 = '00000000-0000-4000-8000-0000000000f2';
const ITEM1 = '00000000-0000-4000-8000-000000000011';
const ITEM2 = '00000000-0000-4000-8000-000000000012';
const MISTAKE_ID = '00000000-0000-4000-8000-000000000021';
const REMEDIATION_ID = '00000000-0000-4000-8000-000000000031';

/** In-memory DEV sessions only — never production persistence. */
const sessions = new Map<string, AssessmentSession>();
const mistakes = new Map<string, MistakeDetail>();
const remediationProgress = new Map<string, ContentProgress>();
/** Server-side keys never appear on SessionItemView wire — DEV keeps them off-item. */
const itemAnswerKeys = new Map<string, string>();

function now(): string {
  return new Date().toISOString();
}

function emptyAssistance() {
  return { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false };
}

function makeItem(
  itemId: string,
  order: number,
  questionId: string,
  stemText: string,
  correctKey: string,
): SessionItemView {
  itemAnswerKeys.set(itemId, correctKey);
  return {
    itemId,
    order,
    questionId,
    status: 'OPEN',
    stem: [{ kind: 'TEXT', text: stemText }],
    options: [
      { key: 'A', blocks: [{ kind: 'TEXT', text: 'Option A' }] },
      { key: 'B', blocks: [{ kind: 'TEXT', text: 'Option B (correct)' }] },
      { key: 'C', blocks: [{ kind: 'TEXT', text: 'Option C' }] },
      { key: 'D', blocks: [{ kind: 'TEXT', text: 'Option D' }] },
    ],
    hintTierCount: 2,
    disclosedTierCount: 0,
    hintLadder: [
      { tierIndex: 0, strength: 'STANDARD', disclosed: false },
      { tierIndex: 1, strength: 'STRONG', disclosed: false },
    ],
    disclosedHints: [],
    strongAssistance: false,
    selectedOptionKey: null,
    correct: null,
    feedback: null,
    outlineItemIds: [],
    objectiveIds: [],
  };
}

function itemCorrectKey(item: SessionItemView): string {
  return itemAnswerKeys.get(item.itemId) ?? 'B';
}

function contextFor(
  session: Pick<
    AssessmentSession,
    | 'sessionId'
    | 'purpose'
    | 'subject'
    | 'packageId'
    | 'packageRevisionId'
    | 'setId'
    | 'lessonResourceId'
    | 'mistakeId'
    | 'examLanguage'
    | 'assistanceSummary'
  >,
  checkpointPassed: boolean | null = null,
): AssessmentSession['context'] {
  return {
    subject: session.subject,
    packageId: session.packageId,
    packageRevisionId: session.packageRevisionId,
    sessionId: session.sessionId,
    sessionPurpose: session.purpose,
    examLanguage: session.examLanguage,
    setId: session.setId,
    lessonResourceId: session.lessonResourceId,
    mistakeId: session.mistakeId,
    outlineItemIds: [],
    objectiveIds: [],
    assistanceSummary: session.assistanceSummary,
    checkpointPassed,
  };
}

export function devGetCheckpointForLesson(
  subject: AcademicSubject,
  resourceId: string,
): CheckpointForLesson | null {
  if (subject !== 'MATHEMATICS') return null;
  if (resourceId !== LESSON_ID) {
    return {
      subject,
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      lessonResourceId: resourceId,
      lessonContentComplete: false,
      startable: false,
      lockReason: 'NO_CHECKPOINT_PUBLISHED',
      checkpointUpdatedSinceLastAttempt: false,
      editions: [],
    };
  }
  return {
    subject,
    packageId: PACKAGE_ID,
    packageRevisionId: REVISION_ID,
    lessonResourceId: resourceId,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: SET_CHECKPOINT,
        examLanguage: 'en',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
      {
        setId: SET_CHECKPOINT,
        examLanguage: 'zh-CN',
        title: {
          english: 'Polynomial checkpoint',
          indonesian: 'Checkpoint polinomial',
          simplifiedChinese: '多项式关卡',
        },
        questionCount: 2,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  };
}

export function devListAssessmentSets(
  subject: AcademicSubject,
  purpose?: string,
): AssessmentSetSummary[] {
  if (subject !== 'MATHEMATICS') return [];
  const all: AssessmentSetSummary[] = [
    {
      setId: SET_CHECKPOINT,
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      purpose: 'CHECKPOINT',
      title: {
        english: 'Polynomial checkpoint',
        indonesian: 'Checkpoint polinomial',
        simplifiedChinese: '多项式关卡',
      },
      examLanguage: 'en',
      difficulty: 'STANDARD',
      questionCount: 2,
      estimatedMinutes: 10,
      feedbackMode: 'IMMEDIATE',
      passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      outlineItemIds: [],
      objectiveIds: [],
      lessonResourceId: LESSON_ID,
    },
    {
      setId: SET_TOPIC,
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      purpose: 'TOPIC_PRACTICE',
      title: {
        english: 'Factorisation practice',
        indonesian: 'Latihan faktorisasi',
        simplifiedChinese: '因式分解练习',
      },
      examLanguage: 'en',
      difficulty: 'FOUNDATION',
      questionCount: 2,
      estimatedMinutes: 12,
      feedbackMode: 'SET_END',
      passPolicy: null,
      outlineItemIds: [],
      objectiveIds: [],
      lessonResourceId: null,
    },
  ];
  if (!purpose) return all;
  return all.filter((s) => s.purpose === purpose);
}

export function devListAssessmentSessions(
  status?: string,
  subject?: string,
): AssessmentSessionResumeSummary[] {
  const want = status ?? 'IN_PROGRESS';
  const rows: AssessmentSessionResumeSummary[] = [];
  for (const session of sessions.values()) {
    if (session.status !== want) continue;
    if (subject && session.subject !== subject) continue;
    rows.push({
      sessionId: session.sessionId,
      status: session.status,
      purpose: session.purpose,
      subject: session.subject,
      packageId: session.packageId,
      packageRevisionId: session.packageRevisionId,
      setId: session.setId,
      mistakeId: session.mistakeId,
      lessonResourceId: session.lessonResourceId,
      title:
        session.purpose === 'REVALIDATION'
          ? null
          : {
              english:
                session.purpose === 'CHECKPOINT'
                  ? 'Polynomial checkpoint'
                  : 'Factorisation practice',
              indonesian:
                session.purpose === 'CHECKPOINT' ? 'Checkpoint polinomial' : 'Latihan faktorisasi',
              simplifiedChinese: session.purpose === 'CHECKPOINT' ? '多项式关卡' : '因式分解练习',
            },
      examLanguage: session.examLanguage,
      feedbackMode: session.feedbackMode,
      questionCount: session.questionCount,
      answeredItemCount: session.items.filter(
        (i) => i.selectedOptionKey != null || i.status === 'LOCKED',
      ).length,
      lockedItemCount: session.items.filter((i) => i.status === 'LOCKED').length,
      updatedAt: session.updatedAt,
    });
  }
  return rows;
}

export function devStartAssessmentSession(
  request: StartAssessmentSessionRequest,
): AssessmentSession {
  for (const existing of sessions.values()) {
    if (
      existing.status === 'IN_PROGRESS' &&
      existing.purpose === request.purpose &&
      existing.setId === request.setId &&
      existing.examLanguage === request.examLanguage
    ) {
      return existing;
    }
  }
  const sessionId = crypto.randomUUID();
  const feedbackMode = request.purpose === 'TOPIC_PRACTICE' ? 'SET_END' : 'IMMEDIATE';
  const items = [
    makeItem(ITEM1, 0, Q1, 'Factorise x² − 5x + 6.', 'B'),
    makeItem(ITEM2, 1, Q2, 'What is the product of the roots of x² − 5x + 6 = 0?', 'B'),
  ];
  const base: AssessmentSession = {
    sessionId,
    status: 'IN_PROGRESS',
    purpose: request.purpose,
    subject: request.subject,
    packageId: PACKAGE_ID,
    packageRevisionId: REVISION_ID,
    setId: request.setId,
    mistakeId: null,
    lessonResourceId: request.purpose === 'CHECKPOINT' ? LESSON_ID : null,
    examLanguage: request.examLanguage,
    feedbackMode,
    planTaskId: null,
    questionCount: items.length,
    assistanceSummary: emptyAssistance(),
    items,
    context: contextFor({
      sessionId,
      purpose: request.purpose,
      subject: request.subject,
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      setId: request.setId,
      lessonResourceId: request.purpose === 'CHECKPOINT' ? LESSON_ID : null,
      mistakeId: null,
      examLanguage: request.examLanguage,
      assistanceSummary: emptyAssistance(),
    }),
    createdAt: now(),
    updatedAt: now(),
    submittedAt: null,
  };
  sessions.set(sessionId, base);
  return base;
}

export function devGetAssessmentSession(sessionId: string): AssessmentSession | null {
  return sessions.get(sessionId) ?? null;
}

export function devDiscloseHint(sessionId: string, itemId: string): DiscloseHintResult | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') return null;
  const item = session.items.find((i) => i.itemId === itemId);
  if (!item || item.status === 'LOCKED') return null;
  const next = item.hintLadder.find((t) => !t.disclosed);
  if (!next) return null;
  if (session.purpose === 'REVALIDATION' && next.strength === 'STRONG') {
    return null;
  }
  const disclosed = {
    tierIndex: next.tierIndex,
    strength: next.strength,
    blocks:
      next.strength === 'STRONG'
        ? [{ kind: 'TEXT' as const, text: 'Full path: (x−2)(x−3). This may reveal the answer.' }]
        : [
            {
              kind: 'TEXT' as const,
              text: 'Try finding two numbers that multiply to 6 and add to −5.',
            },
          ],
  };
  const updated: SessionItemView = {
    ...item,
    disclosedTierCount: item.disclosedTierCount + 1,
    hintLadder: item.hintLadder.map((t) =>
      t.tierIndex === next.tierIndex ? { ...t, disclosed: true } : t,
    ),
    disclosedHints: [...item.disclosedHints, disclosed],
    strongAssistance: item.strongAssistance || next.strength === 'STRONG',
  };
  const assistance = {
    maxTierDisclosed: Math.max(session.assistanceSummary.maxTierDisclosed, next.tierIndex + 1),
    strongUsed: session.assistanceSummary.strongUsed || next.strength === 'STRONG',
    languageAssistUsed: false,
  };
  const nextSession: AssessmentSession = {
    ...session,
    assistanceSummary: assistance,
    items: session.items.map((i) => (i.itemId === itemId ? updated : i)),
    updatedAt: now(),
    context: { ...session.context, assistanceSummary: assistance },
  };
  sessions.set(sessionId, nextSession);
  return { item: updated, disclosed, sessionAssistanceSummary: assistance };
}

export function devSubmitItemAnswer(
  sessionId: string,
  itemId: string,
  selectedOptionKey: string,
): ItemAnswerResult | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') return null;
  const item = session.items.find((i) => i.itemId === itemId);
  if (!item || item.status === 'LOCKED') return null;
  const correctKey = itemCorrectKey(item);
  const correct = selectedOptionKey === correctKey;
  const lockNow = session.feedbackMode === 'IMMEDIATE';
  const feedback = lockNow
    ? {
        correct,
        correctOptionKey: correctKey,
        explanations: [
          {
            language: 'en' as const,
            blocks: [
              {
                kind: 'TEXT' as const,
                text: correct
                  ? 'The factors of 6 that add to −5 are −2 and −3.'
                  : 'Re-check the constant and linear coefficients.',
              },
            ],
          },
        ],
        commonMistakeNotes: correct
          ? []
          : [
              {
                english: 'Sign errors on the constant term are common.',
                indonesian: 'Kesalahan tanda pada konstanta sering terjadi.',
                simplifiedChinese: '常数项符号错误很常见。',
              },
            ],
        relatedResources: correct
          ? []
          : [
              {
                resourceId: REMEDIATION_ID,
                kind: 'REMEDIATION' as const,
                title: {
                  english: 'Review: factorisation',
                  indonesian: 'Ulasan: faktorisasi',
                  simplifiedChinese: '复习：因式分解',
                },
              },
            ],
      }
    : null;

  const updated: SessionItemView = {
    ...item,
    status: lockNow ? 'LOCKED' : 'OPEN',
    selectedOptionKey,
    correct: lockNow ? correct : null,
    feedback,
  };

  const nextSession: AssessmentSession = {
    ...session,
    items: session.items.map((i) => (i.itemId === itemId ? updated : i)),
    updatedAt: now(),
  };
  sessions.set(sessionId, nextSession);

  if (!correct && lockNow && session.purpose !== 'REVALIDATION') {
    upsertMistakeFromItem(nextSession, updated, correctKey);
  }

  return { item: updated, sessionAssistanceSummary: session.assistanceSummary };
}

function upsertMistakeFromItem(
  session: AssessmentSession,
  item: SessionItemView,
  correctKey: string,
): void {
  const existing = [...mistakes.values()].find((m) => m.questionId === item.questionId);
  const detail: MistakeDetail = {
    mistakeId: existing?.mistakeId ?? MISTAKE_ID,
    status: existing?.status ?? 'OPEN',
    subject: session.subject,
    packageId: session.packageId,
    packageRevisionId: session.packageRevisionId,
    questionId: item.questionId,
    examLanguage: session.examLanguage,
    errorCause: existing?.errorCause ?? null,
    privateNote: existing?.privateNote ?? null,
    errorCount: (existing?.errorCount ?? 0) + 1,
    assistanceSummary: session.assistanceSummary,
    revalidationEligible: false,
    lastAttemptId: item.itemId,
    lastSessionId: session.sessionId,
    sourceSetId: session.setId,
    outlineItemIds: item.outlineItemIds,
    objectiveIds: item.objectiveIds,
    attemptQuestion: {
      questionId: item.questionId,
      examLanguage: session.examLanguage,
      stem: item.stem,
      options: item.options,
      outlineItemIds: item.outlineItemIds,
      objectiveIds: item.objectiveIds,
    },
    latestResponse: {
      selectedOptionKey: item.selectedOptionKey ?? '',
      correct: false,
      correctOptionKey: correctKey,
      feedback: item.feedback,
      lastSessionId: session.sessionId,
      lastAttemptId: item.itemId,
      respondedAt: now(),
    },
    remediationCandidates: [
      {
        resourceId: REMEDIATION_ID,
        kind: 'REMEDIATION',
        title: {
          english: 'Review: factorisation',
          indonesian: 'Ulasan: faktorisasi',
          simplifiedChinese: '复习：因式分解',
        },
        preferred: true,
      },
    ],
    nextDueAt: null,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  mistakes.set(detail.mistakeId, detail);
}

export function devSubmitSession(sessionId: string): SessionResult | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.status === 'SUBMITTED') {
    return buildResult(session);
  }
  if (session.status !== 'IN_PROGRESS') return null;

  const lockedItems: SessionItemView[] = session.items.map((item) => {
    if (item.status === 'LOCKED') return item;
    const key = item.selectedOptionKey ?? '';
    const correctKey = itemCorrectKey(item);
    const correct = key === correctKey && key.length > 0;
    const feedback = {
      correct,
      correctOptionKey: correctKey,
      explanations: [
        {
          language: session.examLanguage,
          blocks: [
            { kind: 'TEXT' as const, text: correct ? 'Correct.' : 'Review the solution steps.' },
          ],
        },
      ],
      commonMistakeNotes: [],
      relatedResources: [],
    };
    const locked: SessionItemView = {
      ...item,
      status: 'LOCKED',
      selectedOptionKey: key || null,
      correct,
      feedback,
    };
    if (!correct && key && session.purpose !== 'REVALIDATION') {
      upsertMistakeFromItem(session, locked, correctKey);
    }
    return locked;
  });

  if (session.purpose === 'REVALIDATION' && session.mistakeId) {
    applyDevRevalidationOutcome(
      session.sessionId,
      session.mistakeId,
      lockedItems,
      session.assistanceSummary,
    );
  }

  const correctCount = lockedItems.filter((i) => i.correct === true).length;
  const total = lockedItems.length;
  const strongUsed = session.assistanceSummary.strongUsed;
  const checkpointPassed =
    session.purpose === 'CHECKPOINT' ? correctCount === total && total > 0 && !strongUsed : null;

  const submitted: AssessmentSession = {
    ...session,
    status: 'SUBMITTED',
    items: lockedItems,
    submittedAt: now(),
    updatedAt: now(),
    context: {
      ...session.context,
      checkpointPassed,
      assistanceSummary: session.assistanceSummary,
    },
  };
  sessions.set(sessionId, submitted);
  return buildResult(submitted);
}

function buildResult(session: AssessmentSession): SessionResult {
  const correctCount = session.items.filter((i) => i.correct === true).length;
  const total = session.items.length;
  const mistakeIds = [...mistakes.values()]
    .filter((m) => m.lastSessionId === session.sessionId)
    .map((m) => m.mistakeId);
  return {
    sessionId: session.sessionId,
    status: 'SUBMITTED',
    purpose: session.purpose,
    correctCount,
    total,
    strongAssistanceUsed: session.assistanceSummary.strongUsed,
    checkpointPassed: session.context.checkpointPassed,
    mistakeIds,
    evidenceWritten:
      session.context.checkpointPassed === true
        ? [
            {
              objectiveId: '00000000-0000-4000-8000-000000000041',
              signal: 'CHECKPOINT_PASSED',
              sourceSessionId: session.sessionId,
              at: session.submittedAt ?? now(),
            },
          ]
        : [],
    items: session.items,
    context: session.context,
    submittedAt: session.submittedAt ?? now(),
  };
}

export function devCancelSession(sessionId: string): AssessmentSession | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') return null;
  const cancelled: AssessmentSession = {
    ...session,
    status: 'CANCELLED',
    updatedAt: now(),
  };
  sessions.set(sessionId, cancelled);
  return cancelled;
}

export function devListMistakes(status?: MistakeStatus): MistakeListResponseBody {
  // Seed one mistake when empty so Practice → Mistakes is demoable offline
  if (mistakes.size === 0) {
    mistakes.set(MISTAKE_ID, {
      mistakeId: MISTAKE_ID,
      status: 'OPEN',
      subject: 'MATHEMATICS',
      packageId: PACKAGE_ID,
      packageRevisionId: REVISION_ID,
      questionId: Q1,
      examLanguage: 'en',
      errorCause: null,
      privateNote: null,
      errorCount: 1,
      assistanceSummary: emptyAssistance(),
      revalidationEligible: false,
      lastAttemptId: ITEM1,
      lastSessionId: null,
      sourceSetId: SET_TOPIC,
      outlineItemIds: [],
      objectiveIds: [],
      attemptQuestion: {
        questionId: Q1,
        examLanguage: 'en',
        stem: [{ kind: 'TEXT', text: 'Factorise x² − 5x + 6.' }],
        options: [
          { key: 'A', blocks: [{ kind: 'TEXT', text: 'Option A' }] },
          { key: 'B', blocks: [{ kind: 'TEXT', text: 'Option B (correct)' }] },
          { key: 'C', blocks: [{ kind: 'TEXT', text: 'Option C' }] },
          { key: 'D', blocks: [{ kind: 'TEXT', text: 'Option D' }] },
        ],
        outlineItemIds: [],
        objectiveIds: [],
      },
      latestResponse: {
        selectedOptionKey: 'A',
        correct: false,
        correctOptionKey: 'B',
        feedback: {
          correct: false,
          correctOptionKey: 'B',
          explanations: [
            {
              language: 'en',
              blocks: [{ kind: 'TEXT', text: 'Find factors of 6 that sum to −5.' }],
            },
          ],
          commonMistakeNotes: [],
          relatedResources: [],
        },
        lastSessionId: null,
        lastAttemptId: ITEM1,
        respondedAt: now(),
      },
      remediationCandidates: [
        {
          resourceId: REMEDIATION_ID,
          kind: 'REMEDIATION',
          title: {
            english: 'Review: factorisation',
            indonesian: 'Ulasan: faktorisasi',
            simplifiedChinese: '复习：因式分解',
          },
          preferred: true,
        },
      ],
      nextDueAt: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  let items = [...mistakes.values()];
  if (status) items = items.filter((m) => m.status === status);
  return {
    items: items.map((m) => ({
      mistakeId: m.mistakeId,
      status: m.status,
      subject: m.subject,
      packageId: m.packageId,
      questionId: m.questionId,
      examLanguage: m.examLanguage,
      errorCause: m.errorCause,
      stemPreview: m.attemptQuestion.stem.slice(0, 3),
      errorCount: m.errorCount,
      assistanceSummary: m.assistanceSummary,
      revalidationEligible: m.revalidationEligible,
      lastSessionId: m.lastSessionId,
      updatedAt: m.updatedAt,
    })),
    nextCursor: null,
  };
}

export function devGetMistake(mistakeId: string): MistakeDetail | null {
  if (mistakes.size === 0) devListMistakes();
  const existing = mistakes.get(mistakeId);
  if (!existing) return null;
  if (existing.status === 'OPEN') {
    const next: MistakeDetail = {
      ...existing,
      status: 'REMEDIATION_IN_PROGRESS',
      updatedAt: now(),
    };
    mistakes.set(mistakeId, next);
    return next;
  }
  return existing;
}

export function devUpdateMistakeAnnotation(
  mistakeId: string,
  body: UpdateMistakeAnnotationRequest,
): MistakeDetail | null {
  const existing = mistakes.get(mistakeId);
  if (!existing) return null;
  const next: MistakeDetail = {
    ...existing,
    errorCause: body.errorCause === undefined ? existing.errorCause : body.errorCause,
    privateNote: body.privateNote === undefined ? existing.privateNote : body.privateNote,
    updatedAt: now(),
  };
  mistakes.set(mistakeId, next);
  return next;
}

function applyDevRevalidationOutcome(
  sessionId: string,
  mistakeId: string,
  items: SessionItemView[],
  assistance: AssessmentSession['assistanceSummary'],
): void {
  const existing = mistakes.get(mistakeId);
  if (!existing) return;
  const allCorrect = items.length > 0 && items.every((item) => item.correct === true);
  const assisted = anyAssistanceUsed(assistance);
  const remComplete = remediationProgress.get(REMEDIATION_ID)?.status === 'CONTENT_COMPLETE';
  if (allCorrect && !assisted) {
    mistakes.set(mistakeId, {
      ...existing,
      status: 'REVALIDATION_PASSED',
      revalidationEligible: false,
      lastSessionId: sessionId,
      updatedAt: now(),
    });
    return;
  }
  mistakes.set(mistakeId, {
    ...existing,
    status: remComplete ? 'AWAITING_REVALIDATION' : 'OPEN',
    revalidationEligible: remComplete,
    lastSessionId: sessionId,
    updatedAt: now(),
  });
}

function assistedCorrectQuestionIds(mistakeId: string): Set<string> {
  const excluded = new Set<string>();
  for (const session of sessions.values()) {
    if (
      session.purpose !== 'REVALIDATION' ||
      session.status !== 'SUBMITTED' ||
      session.mistakeId !== mistakeId
    ) {
      continue;
    }
    if (!anyAssistanceUsed(session.assistanceSummary)) continue;
    for (const item of session.items) {
      if (item.correct === true) excluded.add(item.questionId);
    }
  }
  return excluded;
}

function pickDevRevalidationQuestion(mistake: MistakeDetail): {
  questionId: string;
  stem: string;
} {
  const excluded = assistedCorrectQuestionIds(mistake.mistakeId);
  const preferred =
    [Q2, Q1].find((id) => id !== mistake.questionId && !excluded.has(id)) ??
    [Q1, Q2].find((id) => !excluded.has(id)) ??
    mistake.questionId;
  if (preferred === Q2) {
    return {
      questionId: Q2,
      stem: 'Re-check: what is the product of the roots of x² − 5x + 6 = 0?',
    };
  }
  return { questionId: Q1, stem: 'Re-check: factorise x² − 5x + 6.' };
}

export function devStartRevalidation(mistakeId: string): AssessmentSession | null {
  const mistake = mistakes.get(mistakeId) ?? devGetMistake(mistakeId);
  if (!mistake) return null;
  if (mistake.status === 'REVALIDATION_PASSED') return null;
  const progress = remediationProgress.get(REMEDIATION_ID);
  const eligible =
    mistake.revalidationEligible ||
    mistake.status === 'AWAITING_REVALIDATION' ||
    progress?.status === 'CONTENT_COMPLETE';
  if (!eligible) return null;

  for (const existing of sessions.values()) {
    if (
      existing.status === 'IN_PROGRESS' &&
      existing.purpose === 'REVALIDATION' &&
      existing.mistakeId === mistakeId
    ) {
      return existing;
    }
  }

  const sessionId = crypto.randomUUID();
  const picked = pickDevRevalidationQuestion(mistake);
  const item = makeItem(crypto.randomUUID(), 0, picked.questionId, picked.stem, 'B');
  // Strip STRONG from ladder for revalidation client view
  const revalItem: SessionItemView = {
    ...item,
    hintTierCount: 1,
    hintLadder: [{ tierIndex: 0, strength: 'STANDARD', disclosed: false }],
  };
  const session: AssessmentSession = {
    sessionId,
    status: 'IN_PROGRESS',
    purpose: 'REVALIDATION',
    subject: mistake.subject,
    packageId: mistake.packageId,
    packageRevisionId: mistake.packageRevisionId,
    setId: null,
    mistakeId,
    lessonResourceId: null,
    examLanguage: mistake.examLanguage,
    feedbackMode: 'IMMEDIATE',
    planTaskId: null,
    questionCount: 1,
    assistanceSummary: emptyAssistance(),
    items: [revalItem],
    context: contextFor({
      sessionId,
      purpose: 'REVALIDATION',
      subject: mistake.subject,
      packageId: mistake.packageId,
      packageRevisionId: mistake.packageRevisionId,
      setId: null,
      lessonResourceId: null,
      mistakeId,
      examLanguage: mistake.examLanguage,
      assistanceSummary: emptyAssistance(),
    }),
    createdAt: now(),
    updatedAt: now(),
    submittedAt: null,
  };
  sessions.set(sessionId, session);
  return session;
}

export function devGetPublishedRemediation(
  subject: AcademicSubject,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): PublishedRemediationDetail | null {
  if (subject !== 'MATHEMATICS' || resourceId !== REMEDIATION_ID) return null;
  const progress = remediationProgress.get(resourceId) ?? {
    status: 'NOT_STARTED' as const,
    resumeBlockIndex: null,
    updatedAt: null,
    updatedSinceCompleted: false,
  };
  return {
    packageId: PACKAGE_ID,
    packageRevisionId: REVISION_ID,
    subject,
    resourceId,
    title: {
      english: 'Review: factorisation',
      indonesian: 'Ulasan: faktorisasi',
      simplifiedChinese: '复习：因式分解',
    },
    availableExplanationLanguages: ['id', 'en', 'zh-CN'],
    requestedExplanationLanguage: explanationLanguage,
    body: {
      availability: 'AVAILABLE',
      blocks: [
        {
          kind: 'TEXT',
          text:
            explanationLanguage === 'id'
              ? 'Cari dua bilangan yang hasil kalinya 6 dan jumlahnya −5.'
              : explanationLanguage === 'zh-CN'
                ? '找出乘积为 6、和为 −5 的两个数。'
                : 'Find two numbers that multiply to 6 and add to −5.',
        },
        { kind: 'MATH', latex: '(x-2)(x-3)=x^2-5x+6', displayMode: true },
      ],
    },
    contentProgress: progress,
    outlineItemIds: [],
    objectiveIds: [],
  };
}

export function devUpsertRemediationProgress(
  subject: AcademicSubject,
  resourceId: string,
  status: 'IN_PROGRESS' | 'CONTENT_COMPLETE',
  resumeBlockIndex?: number | null,
): ContentProgress | null {
  if (subject !== 'MATHEMATICS' || resourceId !== REMEDIATION_ID) return null;
  const next: ContentProgress = {
    status,
    resumeBlockIndex: resumeBlockIndex ?? null,
    updatedAt: now(),
    updatedSinceCompleted: false,
  };
  remediationProgress.set(resourceId, next);
  // Mark mistakes revalidation-eligible
  if (status === 'CONTENT_COMPLETE') {
    for (const [id, m] of mistakes) {
      if (m.status === 'REVALIDATION_PASSED') continue;
      mistakes.set(id, {
        ...m,
        status: 'AWAITING_REVALIDATION',
        revalidationEligible: true,
        updatedAt: now(),
      });
    }
  } else {
    for (const [id, m] of mistakes) {
      if (m.status === 'OPEN') {
        mistakes.set(id, { ...m, status: 'REMEDIATION_IN_PROGRESS', updatedAt: now() });
      }
    }
  }
  return next;
}

/** Test helper to reset in-memory DEV state. */
export function __resetAssessmentDevFallback(): void {
  sessions.clear();
  mistakes.clear();
  remediationProgress.clear();
  itemAnswerKeys.clear();
}

export const DEV_IDS = {
  PACKAGE_ID,
  REVISION_ID,
  LESSON_ID,
  SET_CHECKPOINT,
  SET_TOPIC,
  Q1,
  Q2,
  MISTAKE_ID,
  REMEDIATION_ID,
} as const;
