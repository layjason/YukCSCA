import type { components } from '@/shared/api/generated/openapi';

export type TermCard = components['schemas']['AcademicStudent.TermCard'];
export type TermDefinition = components['schemas']['AcademicStudent.TermDefinition'];
export type TermSurfaceForm = components['schemas']['AcademicStudent.TermSurfaceForm'];
export type TermClass = components['schemas']['AcademicAdmin.TermClass'];
export type TermClassGroup = components['schemas']['AcademicStudent.TermClassGroup'];
export type TermFamiliarity = components['schemas']['AcademicStudent.TermFamiliarity'];
export type TermEncounterPlace = components['schemas']['AcademicStudent.TermEncounterPlace'];
export type TermMetIn = components['schemas']['AcademicStudent.TermMetIn'];
export type TermSpan = components['schemas']['AcademicStudent.TermSpan'];
export type TerminologyPreview = components['schemas']['AcademicStudent.TerminologyPreview'];
export type TerminologyPreviewRef = components['schemas']['AcademicStudent.TerminologyPreviewRef'];
export type PreviewProgress = components['schemas']['AcademicStudent.PreviewProgress'];
export type PreviewProgressStatus = components['schemas']['AcademicStudent.PreviewProgressStatus'];
export type PreviewMatchTarget = components['schemas']['AcademicStudent.PreviewMatchTarget'];
export type PreviewCheckResult = components['schemas']['AcademicStudent.PreviewCheckResult'];
export type NotebookEntry = components['schemas']['AcademicStudent.NotebookEntry'];
export type NotebookEntryDetail = components['schemas']['AcademicStudent.NotebookEntryDetail'];
export type NotebookListResponseBody =
  components['schemas']['AcademicStudent.NotebookListResponseBody'];
export type TermLookupRequest = components['schemas']['AcademicStudent.TermLookupRequest'];
export type TermLookupResult = components['schemas']['AcademicStudent.TermLookupResult'];
export type BookmarkTermRequest = components['schemas']['AcademicStudent.BookmarkTermRequest'];
export type BookmarkTermResult = components['schemas']['AcademicStudent.BookmarkTermResult'];
export type BookmarkLessonTermsResult =
  components['schemas']['AcademicStudent.BookmarkLessonTermsResult'];
export type TermReviewPrompt = components['schemas']['AcademicStudent.TermReviewPrompt'];
export type TermReviewResult = components['schemas']['AcademicStudent.TermReviewResult'];
export type TermReviewKind = components['schemas']['AcademicStudent.TermReviewKind'];
export type LessonTerminology = components['schemas']['AcademicStudent.LessonTerminology'];
export type LanguageHelpView = components['schemas']['AssessmentStudent.LanguageHelpView'];
export type LanguageHelpSpan = components['schemas']['AssessmentStudent.LanguageHelpSpan'];
export type LanguageHelpTrigger = components['schemas']['AssessmentStudent.LanguageHelpTrigger'];
export type DiscloseLanguageHelpResult =
  components['schemas']['AssessmentStudent.DiscloseLanguageHelpResult'];
export type AcademicSubject = components['schemas']['AcademicAdmin.AcademicSubject'];
export type ExplanationLanguage = components['schemas']['AcademicAdmin.ExplanationLanguage'];
export type TermDraft = components['schemas']['AcademicAdmin.TermDraft'];
export type AuthoredTermAttachment = components['schemas']['AcademicAdmin.AuthoredTermAttachment'];

export const TERM_CLASSES: readonly TermClass[] = [
  'EXAM_INSTRUCTION',
  'LOGICAL_EXPRESSION',
  'TOPIC_TERM',
] as const;

export function classGroupFor(termClass: TermClass): TermClassGroup {
  return termClass === 'TOPIC_TERM' ? 'TOPIC_TERM' : 'EXAM_WORDING';
}
