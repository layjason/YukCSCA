import type { components } from '@/shared/api/generated/openapi';

export type AcademicSubject = components['schemas']['AcademicAdmin.AcademicSubject'];
export type ExamLanguage = components['schemas']['AcademicAdmin.ExamLanguage'];
export type ExplanationLanguage = components['schemas']['AcademicAdmin.ExplanationLanguage'];
export type LocalizedText = components['schemas']['AcademicAdmin.LocalizedText'];
export type ContentBlock = components['schemas']['AcademicAdmin.ContentBlock'];
export type HintStrength = components['schemas']['AcademicAdmin.HintStrength'];
export type AssessmentFeedbackMode = components['schemas']['AcademicAdmin.AssessmentFeedbackMode'];
export type AssessmentSetPurpose = components['schemas']['AcademicAdmin.AssessmentSetPurpose'];

export type AssessmentSession = components['schemas']['AssessmentStudent.AssessmentSession'];
export type AssessmentSessionStatus =
  components['schemas']['AssessmentStudent.AssessmentSessionStatus'];
export type AssessmentSessionPurpose =
  components['schemas']['AssessmentStudent.AssessmentSessionPurpose'];
export type AssessmentSessionResumeSummary =
  components['schemas']['AssessmentStudent.AssessmentSessionResumeSummary'];
export type AssessmentSetSummary = components['schemas']['AssessmentStudent.AssessmentSetSummary'];
export type SessionItemView = components['schemas']['AssessmentStudent.SessionItemView'];
export type SessionItemOption = components['schemas']['AssessmentStudent.SessionItemOption'];
export type SessionResult = components['schemas']['AssessmentStudent.SessionResult'];
export type ItemAnswerResult = components['schemas']['AssessmentStudent.ItemAnswerResult'];
export type DiscloseHintResult = components['schemas']['AssessmentStudent.DiscloseHintResult'];
export type HintTierMeta = components['schemas']['AssessmentStudent.HintTierMeta'];
export type DisclosedHintTier = components['schemas']['AssessmentStudent.DisclosedHintTier'];
export type ItemFeedback = components['schemas']['AssessmentStudent.ItemFeedback'];
export type AssistanceSummary = components['schemas']['AssessmentStudent.AssistanceSummary'];
export type CheckpointForLesson = components['schemas']['AssessmentStudent.CheckpointForLesson'];
export type CheckpointEdition = components['schemas']['AssessmentStudent.CheckpointEdition'];
export type CheckpointLockReason = components['schemas']['AssessmentStudent.CheckpointLockReason'];
export type StartAssessmentSessionRequest =
  components['schemas']['AssessmentStudent.StartAssessmentSessionRequest'];
export type MistakeListResponseBody =
  components['schemas']['AssessmentStudent.MistakeListResponseBody'];
export type MistakeSummary = components['schemas']['AssessmentStudent.MistakeSummary'];
export type MistakeDetail = components['schemas']['AssessmentStudent.MistakeDetail'];
export type MistakeStatus = components['schemas']['AssessmentStudent.MistakeStatus'];
export type ErrorCause = components['schemas']['AssessmentStudent.ErrorCause'];
export type UpdateMistakeAnnotationRequest =
  components['schemas']['AssessmentStudent.UpdateMistakeAnnotationRequest'];
export type RemediationCandidate = components['schemas']['AssessmentStudent.RemediationCandidate'];
export type RelatedResourceRef = components['schemas']['AssessmentStudent.RelatedResourceRef'];
export type PublishedRemediationDetail =
  components['schemas']['AcademicStudent.PublishedRemediationDetail'];
export type ContentProgress = components['schemas']['AcademicStudent.ContentProgress'];
export type UpsertContentProgressRequest =
  components['schemas']['AcademicStudent.UpsertContentProgressRequest'];

export const ACADEMIC_SUBJECTS: readonly AcademicSubject[] = ['MATHEMATICS'] as const;
export const EXAM_LANGUAGES: readonly ExamLanguage[] = ['en', 'zh-CN'] as const;
export const EXPLANATION_LANGUAGES: readonly ExplanationLanguage[] = ['id', 'en', 'zh-CN'] as const;
export const ERROR_CAUSES: readonly ErrorCause[] = [
  'CONCEPTUAL_GAP',
  'PREREQUISITE_GAP',
  'TERMINOLOGY_MISUNDERSTANDING',
  'CARELESSNESS',
  'TIME_MANAGEMENT',
] as const;

export function isAcademicSubject(value: string | undefined): value is AcademicSubject {
  return value === 'MATHEMATICS';
}

export function isExamLanguage(value: string | undefined): value is ExamLanguage {
  return value === 'en' || value === 'zh-CN';
}

export function isExplanationLanguage(value: string | undefined): value is ExplanationLanguage {
  return value === 'id' || value === 'en' || value === 'zh-CN';
}
