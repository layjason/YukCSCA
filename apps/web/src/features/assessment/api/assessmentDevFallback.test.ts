import { afterEach, expect, test } from 'vitest';
import {
  __resetAssessmentDevFallback,
  DEV_IDS,
  devDiscloseHint,
  devGetMistake,
  devListMistakes,
  devStartRevalidation,
  devSubmitItemAnswer,
  devSubmitSession,
  devUpsertRemediationProgress,
} from './assessmentDevFallback';

afterEach(() => {
  __resetAssessmentDevFallback();
});

test('devGetMistake promotes OPEN to REMEDIATION_IN_PROGRESS and is idempotent', () => {
  const seeded = devListMistakes().items[0];
  expect(seeded).toBeDefined();
  expect(seeded?.status).toBe('OPEN');

  const first = devGetMistake(DEV_IDS.MISTAKE_ID);
  expect(first?.status).toBe('REMEDIATION_IN_PROGRESS');
  const second = devGetMistake(DEV_IDS.MISTAKE_ID);
  expect(second?.status).toBe('REMEDIATION_IN_PROGRESS');
  expect(second?.updatedAt).toBe(first?.updatedAt);
});

test('devStartRevalidation stays closed until corrective complete', () => {
  devListMistakes();
  expect(devGetMistake(DEV_IDS.MISTAKE_ID)?.status).toBe('REMEDIATION_IN_PROGRESS');
  expect(devStartRevalidation(DEV_IDS.MISTAKE_ID)).toBeNull();

  devUpsertRemediationProgress('MATHEMATICS', DEV_IDS.REMEDIATION_ID, 'CONTENT_COMPLETE', 0);
  const session = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  expect(session?.purpose).toBe('REVALIDATION');
  expect(session?.mistakeId).toBe(DEV_IDS.MISTAKE_ID);
  expect(session?.items[0]?.questionId).toBe(DEV_IDS.Q2);
});

test('dev recheck after a hinted correct answer uses another question', () => {
  devListMistakes();
  devUpsertRemediationProgress('MATHEMATICS', DEV_IDS.REMEDIATION_ID, 'CONTENT_COMPLETE', 0);
  const first = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  expect(first).not.toBeNull();
  const itemId = first?.items[0]?.itemId;
  expect(itemId).toBeDefined();
  if (!first || !itemId) return;

  expect(devDiscloseHint(first.sessionId, itemId)).not.toBeNull();
  expect(devSubmitItemAnswer(first.sessionId, itemId, 'B')?.item.correct).toBe(true);
  const submitted = devSubmitSession(first.sessionId);
  expect(submitted?.purpose).toBe('REVALIDATION');
  expect(devGetMistake(DEV_IDS.MISTAKE_ID)?.status).toBe('AWAITING_REVALIDATION');

  const second = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  expect(second?.items[0]?.questionId).toBe(DEV_IDS.Q1);
  expect(second?.items[0]?.questionId).not.toBe(first.items[0]?.questionId);
});

test('dev remediations complete does not reopen a passed mistake', () => {
  devListMistakes();
  devUpsertRemediationProgress('MATHEMATICS', DEV_IDS.REMEDIATION_ID, 'CONTENT_COMPLETE', 0);
  const first = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  const itemId = first?.items[0]?.itemId;
  expect(first && itemId).toBeTruthy();
  if (!first || !itemId) return;
  expect(devSubmitItemAnswer(first.sessionId, itemId, 'B')?.item.correct).toBe(true);
  expect(devSubmitSession(first.sessionId)?.purpose).toBe('REVALIDATION');
  expect(devGetMistake(DEV_IDS.MISTAKE_ID)?.status).toBe('REVALIDATION_PASSED');

  devUpsertRemediationProgress('MATHEMATICS', DEV_IDS.REMEDIATION_ID, 'CONTENT_COMPLETE', 0);
  expect(devGetMistake(DEV_IDS.MISTAKE_ID)?.status).toBe('REVALIDATION_PASSED');
  expect(devStartRevalidation(DEV_IDS.MISTAKE_ID)).toBeNull();
});

test('dev recheck reuses the original when every alternate was already hinted-correct', () => {
  devListMistakes();
  devUpsertRemediationProgress('MATHEMATICS', DEV_IDS.REMEDIATION_ID, 'CONTENT_COMPLETE', 0);

  const first = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  const firstItemId = first?.items[0]?.itemId;
  expect(first && firstItemId).toBeTruthy();
  if (!first || !firstItemId) return;
  expect(devDiscloseHint(first.sessionId, firstItemId)).not.toBeNull();
  expect(devSubmitItemAnswer(first.sessionId, firstItemId, 'B')?.item.correct).toBe(true);
  expect(devSubmitSession(first.sessionId)).not.toBeNull();

  const second = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  const secondItemId = second?.items[0]?.itemId;
  expect(second && secondItemId).toBeTruthy();
  if (!second || !secondItemId) return;
  expect(second.items[0]?.questionId).toBe(DEV_IDS.Q1);
  expect(devDiscloseHint(second.sessionId, secondItemId)).not.toBeNull();
  expect(devSubmitItemAnswer(second.sessionId, secondItemId, 'B')?.item.correct).toBe(true);
  expect(devSubmitSession(second.sessionId)).not.toBeNull();

  const third = devStartRevalidation(DEV_IDS.MISTAKE_ID);
  expect(third?.items[0]?.questionId).toBe(DEV_IDS.Q1);
});
