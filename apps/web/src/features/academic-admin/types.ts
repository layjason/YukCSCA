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

export type AcademicVideoAsset = components['schemas']['AcademicAdmin.AcademicVideoAsset'];
export type VideoAssetSource = components['schemas']['AcademicAdmin.VideoAssetSource'];
export type VideoAssetStatus = components['schemas']['AcademicAdmin.VideoAssetStatus'];
export type VideoUploadSlot = components['schemas']['AcademicAdmin.VideoUploadSlot'];
export type CreateVideoUploadSlotRequest =
  components['schemas']['AcademicAdmin.CreateVideoUploadSlotRequest'];
export type ConfirmVideoUploadRequest =
  components['schemas']['AcademicAdmin.ConfirmVideoUploadRequest'];
export type VideoPlaybackGrant = components['schemas']['AcademicAdmin.VideoPlaybackGrant'];
export type SceneSegment = components['schemas']['AcademicAdmin.SceneSegment'];
export type SceneSpecification = components['schemas']['AcademicAdmin.SceneSpecification'];
export type SceneSpecificationInput =
  components['schemas']['AcademicAdmin.SceneSpecificationInput'];
export type SceneTemplateRegistry = components['schemas']['AcademicAdmin.SceneTemplateRegistry'];
export type SceneTemplateAction = components['schemas']['AcademicAdmin.SceneTemplateAction'];
export type SceneTemplateParamDescriptor =
  components['schemas']['AcademicAdmin.SceneTemplateParamDescriptor'];
export type SceneTemplateParamKind = components['schemas']['AcademicAdmin.SceneTemplateParamKind'];
export type RenderJob = components['schemas']['AcademicAdmin.RenderJob'];
export type RenderJobKind = components['schemas']['AcademicAdmin.RenderJobKind'];
export type RenderJobState = components['schemas']['AcademicAdmin.RenderJobState'];
export type RenderJobError = components['schemas']['AcademicAdmin.RenderJobError'];
export type RenderJobErrorCode = components['schemas']['AcademicAdmin.RenderJobErrorCode'];
export type ResourceVideoAttachment =
  components['schemas']['AcademicAdmin.ResourceVideoAttachment'];
export type PutVideoCaptionsRequest =
  components['schemas']['AcademicAdmin.PutVideoCaptionsRequest'];
export type VideoValidationRetryConflictProblem =
  components['schemas']['AcademicAdmin.VideoValidationRetryConflictProblem'];

export type AdminEditorTab =
  'source' | 'outline' | 'objectives' | 'resources' | 'questions' | 'assessment' | 'mock' | 'terms';
