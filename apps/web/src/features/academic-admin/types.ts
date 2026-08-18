import type { components } from '@/shared/api/generated/openapi';

export type AcademicPackage = components['schemas']['AcademicAdmin.AcademicPackage'];
export type AcademicPackageSummary = components['schemas']['AcademicAdmin.AcademicPackageSummary'];
export type AcademicPackageDraft = components['schemas']['AcademicAdmin.AcademicPackageDraft'];
export type AcademicPackageDraftInput =
  components['schemas']['AcademicAdmin.AcademicPackageDraftInput'];
export type OfficialSyllabus = components['schemas']['AcademicAdmin.OfficialSyllabus'];
export type SyllabusOutlineItem = components['schemas']['AcademicAdmin.SyllabusOutlineItem'];
export type LearningObjective = components['schemas']['AcademicAdmin.LearningObjective'];
export type StudyResource = AcademicPackageDraft['resources'][number];
export type Question = AcademicPackageDraft['questions'][number];
export type MockPaper = AcademicPackageDraft['mocks'][number];
export type AssessmentSet = components['schemas']['AcademicAdmin.AssessmentSet'];
export type HintTier = components['schemas']['AcademicAdmin.HintTier'];
export type ContentBlock = components['schemas']['AcademicAdmin.ContentBlock'];
export type TextContentBlock = components['schemas']['AcademicAdmin.TextContentBlock'];
export type MathContentBlock = components['schemas']['AcademicAdmin.MathContentBlock'];
export type ImageContentBlock = components['schemas']['AcademicAdmin.ImageContentBlock'];
export type AcademicImage = components['schemas']['AcademicAdmin.AcademicImage'];
export type AcademicValidationProblem =
  components['schemas']['AcademicAdmin.AcademicValidationProblem'];
export type AcademicValidationViolation =
  components['schemas']['AcademicAdmin.AcademicValidationViolation'];
export type LocalizedText = components['schemas']['AcademicAdmin.LocalizedText'];
export type ProvenanceInput = components['schemas']['AcademicAdmin.ProvenanceInput'];
export type DraftProvenanceInput = components['schemas']['AcademicAdmin.DraftProvenanceInput'];
export type ContentOrigin = components['schemas']['AcademicAdmin.ContentOrigin'];
export type ExamLanguage = components['schemas']['AcademicAdmin.ExamLanguage'];
export type ExplanationLanguage = components['schemas']['AcademicAdmin.ExplanationLanguage'];
export type QuestionDifficulty = components['schemas']['AcademicAdmin.QuestionDifficulty'];

export type TermDraft = components['schemas']['AcademicAdmin.TermDraft'];
export type TermClass = components['schemas']['AcademicAdmin.TermClass'];
export type AuthoredTermAttachment = components['schemas']['AcademicAdmin.AuthoredTermAttachment'];

export type AdminEditorTab =
  'source' | 'outline' | 'objectives' | 'resources' | 'questions' | 'assessment' | 'mock' | 'terms';
