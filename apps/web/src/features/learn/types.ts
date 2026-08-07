import type { components } from '@/shared/api/generated/openapi';

export type AcademicSubject = components['schemas']['AcademicAdmin.AcademicSubject'];
export type ExplanationLanguage = components['schemas']['AcademicAdmin.ExplanationLanguage'];
export type LocalizedText = components['schemas']['AcademicAdmin.LocalizedText'];
export type ContentBlock = components['schemas']['AcademicAdmin.ContentBlock'];
export type ExamLanguage = components['schemas']['AcademicAdmin.ExamLanguage'];

export type ContentProgress = components['schemas']['AcademicStudent.ContentProgress'];
export type ContentProgressStatus = components['schemas']['AcademicStudent.ContentProgressStatus'];
export type ProductCoverage = components['schemas']['AcademicStudent.ProductCoverage'];
export type LessonSummary = components['schemas']['AcademicStudent.LessonSummary'];
export type SyllabusOutlineNode = components['schemas']['AcademicStudent.SyllabusOutlineNode'];
export type OfficialSourcePanel = components['schemas']['AcademicStudent.OfficialSourcePanel'];
export type PublishedPackageSummary =
  components['schemas']['AcademicStudent.PublishedPackageSummary'];
export type PublishedPackageBrowse =
  components['schemas']['AcademicStudent.PublishedPackageBrowse'];
export type PublishedLessonDetail = components['schemas']['AcademicStudent.PublishedLessonDetail'];
export type LessonBody = components['schemas']['AcademicStudent.LessonBody'];
export type UpsertContentProgressRequest =
  components['schemas']['AcademicStudent.UpsertContentProgressRequest'];
export type WritableContentProgressStatus =
  components['schemas']['AcademicStudent.WritableContentProgressStatus'];

export const EXPLANATION_LANGUAGES: readonly ExplanationLanguage[] = ['id', 'en', 'zh-CN'] as const;

export const ACADEMIC_SUBJECTS: readonly AcademicSubject[] = ['MATHEMATICS'] as const;

export function isAcademicSubject(value: string | undefined): value is AcademicSubject {
  return value === 'MATHEMATICS';
}

export function isExplanationLanguage(value: string | undefined): value is ExplanationLanguage {
  return value === 'id' || value === 'en' || value === 'zh-CN';
}
