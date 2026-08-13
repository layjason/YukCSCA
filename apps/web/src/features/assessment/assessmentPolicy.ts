import type {
  AssessmentSession,
  AssessmentSessionPurpose,
  HintStrength,
  HintTierMeta,
  MistakeStatus,
  SessionItemView,
  SessionResult,
} from './types';

/** Next undisclosed tier on the ladder, or null when exhausted / no ladder. */
export function nextHintTier(item: SessionItemView): HintTierMeta | null {
  if (!item.hintLadder || item.hintLadder.length === 0) return null;
  const next = item.hintLadder.find((tier) => !tier.disclosed);
  return next ?? null;
}

/**
 * Whether the next hint disclosure needs a soft pre-confirm.
 * STRONG may reveal the answer — never show a bare "Strong" label alone.
 */
export function shouldConfirmBeforeHint(item: SessionItemView): boolean {
  const next = nextHintTier(item);
  return next?.strength === 'STRONG';
}

/**
 * STRONG tiers are pre-disabled for REVALIDATION so the client never probes disclose.
 * Also block when the next tier is STRONG and purpose is REVALIDATION.
 */
export function isHintActionDisabled(
  item: SessionItemView,
  purpose: AssessmentSessionPurpose,
): { disabled: boolean; reason: 'none' | 'locked' | 'exhausted' | 'revalidation_strong' } {
  if (item.status === 'LOCKED') {
    return { disabled: true, reason: 'locked' };
  }
  const next = nextHintTier(item);
  if (!next) {
    return { disabled: true, reason: 'exhausted' };
  }
  if (purpose === 'REVALIDATION' && next.strength === 'STRONG') {
    return { disabled: true, reason: 'revalidation_strong' };
  }
  return { disabled: false, reason: 'none' };
}

/** First OPEN item without a selection, else first OPEN, else 0. Client-side resume focus. */
export function resumeItemIndex(items: readonly SessionItemView[]): number {
  if (items.length === 0) return 0;
  const unanswered = items.findIndex(
    (item) =>
      item.status === 'OPEN' && (item.selectedOptionKey == null || item.selectedOptionKey === ''),
  );
  if (unanswered >= 0) return unanswered;
  const open = items.findIndex((item) => item.status === 'OPEN');
  if (open >= 0) return open;
  return 0;
}

export function canLockAnswer(item: SessionItemView, selectedOptionKey: string | null): boolean {
  if (item.status === 'LOCKED') return false;
  return Boolean(selectedOptionKey && selectedOptionKey.length > 0);
}

/**
 * IMMEDIATE: feedback appears after lock.
 * SET_END: selection may stay OPEN until set submit; no per-item feedback until then.
 */
export function feedbackVisibleForItem(
  item: SessionItemView,
  feedbackMode: 'IMMEDIATE' | 'SET_END',
  sessionStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'CANCELLED',
): boolean {
  if (sessionStatus === 'SUBMITTED') {
    return item.feedback != null || item.correct != null;
  }
  if (feedbackMode === 'IMMEDIATE') {
    return item.status === 'LOCKED' && (item.feedback != null || item.correct != null);
  }
  // SET_END: only after session submit
  return false;
}

export function allItemsAnswered(items: readonly SessionItemView[]): boolean {
  if (items.length === 0) return false;
  return items.every(
    (item) =>
      item.status === 'LOCKED' ||
      (item.selectedOptionKey != null && item.selectedOptionKey.length > 0),
  );
}

export function allItemsLocked(items: readonly SessionItemView[]): boolean {
  return items.length > 0 && items.every((item) => item.status === 'LOCKED');
}

/**
 * Whether the student can finish an IN_PROGRESS session from the player chrome.
 * SET_END: all items answered (may still be OPEN until set submit).
 * IMMEDIATE: all items LOCKED — covers auto-submit failure recovery and resume of all-locked sessions.
 */
export function canFinishInProgressSession(
  session: Pick<AssessmentSession, 'status' | 'feedbackMode' | 'items'>,
): boolean {
  if (session.status !== 'IN_PROGRESS') return false;
  if (session.feedbackMode === 'IMMEDIATE') {
    return allItemsLocked(session.items);
  }
  return allItemsAnswered(session.items);
}

/** Derive score from items when reviewing a SUBMITTED session without SessionResult body. */
export function scoreFromItems(items: readonly SessionItemView[]): {
  correctCount: number;
  total: number;
} {
  const total = items.length;
  const correctCount = items.filter((item) => item.correct === true).length;
  return { correctCount, total };
}

/**
 * Result copy key — never Mastered / Stable Mastery.
 * CHECKPOINT: pass | fail; TOPIC_PRACTICE: score only;
 * REVALIDATION: independent pass only when fully correct **and** zero assistance (D-16).
 */
export type ResultCopyKind =
  | 'checkpoint_pass'
  | 'checkpoint_fail'
  | 'topic_score'
  | 'revalidation_pass'
  | 'revalidation_fail'
  | 'revalidation_assisted'
  | 'score_only';

export type AssistanceUsageInput = {
  maxTierDisclosed?: number | null;
  strongUsed?: boolean | null;
  languageAssistUsed?: boolean | null;
};

/** True when any logged assistance would block REVALIDATION_PASSED (D-16). */
export function anyAssistanceUsed(
  summary: AssistanceUsageInput | null | undefined,
  strongAssistanceUsed?: boolean | null,
): boolean {
  if (strongAssistanceUsed === true) return true;
  if (!summary) return false;
  return (
    (summary.maxTierDisclosed ?? 0) > 0 ||
    summary.strongUsed === true ||
    summary.languageAssistUsed === true
  );
}

/** True when this item disclosed a hint or recorded strong assistance. */
export function itemUsedAssistance(
  item: Pick<
    SessionItemView,
    'disclosedTierCount' | 'strongAssistance' | 'disclosedHints' | 'hintLadder'
  >,
): boolean {
  if (item.strongAssistance) return true;
  if ((item.disclosedTierCount ?? 0) > 0) return true;
  if (item.disclosedHints.some((hint) => hint.tierIndex >= 0)) return true;
  return item.hintLadder.some((tier) => tier.disclosed);
}

export type MistakeNextAction =
  'continue_revalidation' | 'start_revalidation' | 'study_first' | 'already_passed';

/** Next honest CTA for a mistake. Passed never offers Recheck. */
export function mistakeNextAction(
  status: MistakeStatus,
  revalidationEligible: boolean,
  hasInProgressRevalidation: boolean,
): MistakeNextAction {
  if (hasInProgressRevalidation) return 'continue_revalidation';
  if (status === 'REVALIDATION_PASSED') return 'already_passed';
  if (revalidationEligible) return 'start_revalidation';
  return 'study_first';
}

export function resultCopyKind(
  purpose: AssessmentSessionPurpose,
  checkpointPassed: boolean | null | undefined,
  correctCount: number,
  total: number,
  options?: {
    revalidationPassed?: boolean | null;
    /** When true, blocks revalidation pass even if every item is correct (D-16). */
    assistanceUsed?: boolean | null;
    /** D-10: STRONG assistance blocks checkpoint pass when server flag is absent. */
    strongAssistanceUsed?: boolean | null;
  },
): ResultCopyKind {
  if (purpose === 'CHECKPOINT') {
    if (checkpointPassed === true) return 'checkpoint_pass';
    if (checkpointPassed === false) return 'checkpoint_fail';
    // Incomplete projection: apply D-10 STRONG rule client-side, never claim mastery.
    if (options?.strongAssistanceUsed === true) return 'checkpoint_fail';
    return correctCount === total && total > 0 ? 'checkpoint_pass' : 'checkpoint_fail';
  }
  if (purpose === 'REVALIDATION') {
    if (options?.revalidationPassed === true) return 'revalidation_pass';
    if (options?.revalidationPassed === false) {
      return options.assistanceUsed === true && correctCount === total && total > 0
        ? 'revalidation_assisted'
        : 'revalidation_fail';
    }
    // Independent evidence: any assistance (STANDARD or STRONG) blocks pass.
    // Assisted-correct is not a fail — the student still needs an unassisted recheck.
    if (options?.assistanceUsed === true && correctCount === total && total > 0) {
      return 'revalidation_assisted';
    }
    if (options?.assistanceUsed === true) return 'revalidation_fail';
    return correctCount === total && total > 0 ? 'revalidation_pass' : 'revalidation_fail';
  }
  return 'topic_score';
}

/** Prohibited mastery claim strings must never appear in student-facing result chrome. */
export function containsProhibitedMasteryClaim(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('mastered') || lower.includes('stable mastery');
}

export function strengthOfTier(
  ladder: readonly HintTierMeta[],
  tierIndex: number,
): HintStrength | null {
  return ladder.find((t) => t.tierIndex === tierIndex)?.strength ?? null;
}

export function sessionProgress(session: AssessmentSession): {
  answered: number;
  locked: number;
  total: number;
} {
  const total = session.items.length;
  const locked = session.items.filter((i) => i.status === 'LOCKED').length;
  const answered = session.items.filter(
    (i) => i.status === 'LOCKED' || (i.selectedOptionKey != null && i.selectedOptionKey.length > 0),
  ).length;
  return { answered, locked, total };
}

export function resultFromSessionReview(session: AssessmentSession): {
  correctCount: number;
  total: number;
  checkpointPassed: boolean | null;
  purpose: AssessmentSessionPurpose;
  mistakeHint: boolean;
} {
  const { correctCount, total } = scoreFromItems(session.items);
  return {
    correctCount,
    total,
    checkpointPassed: session.context.checkpointPassed,
    purpose: session.purpose,
    mistakeHint: session.items.some((i) => i.correct === false),
  };
}

export function shouldAutoSubmitAfterLastImmediateLock(
  session: AssessmentSession,
  updatedItem: SessionItemView,
): boolean {
  if (session.feedbackMode !== 'IMMEDIATE') return false;
  if (updatedItem.status !== 'LOCKED') return false;
  const others = session.items.filter((i) => i.itemId !== updatedItem.itemId);
  return others.every((i) => i.status === 'LOCKED');
}

export function mergeItemIntoSession(
  session: AssessmentSession,
  item: SessionItemView,
  assistanceSummary?: AssessmentSession['assistanceSummary'],
): AssessmentSession {
  return {
    ...session,
    assistanceSummary: assistanceSummary ?? session.assistanceSummary,
    items: session.items.map((existing) => (existing.itemId === item.itemId ? item : existing)),
    updatedAt: new Date().toISOString(),
  };
}

export function applySessionResult(
  session: AssessmentSession,
  result: SessionResult,
): AssessmentSession {
  return {
    ...session,
    status: 'SUBMITTED',
    submittedAt: result.submittedAt,
    assistanceSummary: {
      maxTierDisclosed: session.assistanceSummary.maxTierDisclosed,
      strongUsed: result.strongAssistanceUsed || session.assistanceSummary.strongUsed,
      languageAssistUsed: session.assistanceSummary.languageAssistUsed,
    },
    items: result.items,
    context: result.context,
    updatedAt: result.submittedAt,
  };
}
