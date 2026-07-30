import type { components } from '@/shared/api/generated/openapi';

export type StudentProfile = components['schemas']['Profile.StudentProfile'];
export type UpdateMyStudentProfileRequest =
  components['schemas']['Profile.UpdateMyStudentProfileRequest'];
export type StudentGrade = components['schemas']['Profile.StudentGrade'];
export type ExplanationLanguage = components['schemas']['Profile.ExplanationLanguage'];
export type ValidationProblem = components['schemas']['Profile.ValidationProblem'];
export type FieldViolation = components['schemas']['Profile.FieldViolation'];
export type FieldViolationCode = components['schemas']['Profile.FieldViolationCode'];
export type StudentActivationField = components['schemas']['Profile.StudentActivationField'];
