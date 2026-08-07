import type { AcademicPackageSummary, ExamLanguage, OfficialSyllabus } from './types';

/**
 * Supported creatable subjects for the academic admin workspace.
 * Package lifecycle is subject-agnostic; adding a subject means extending
 * this map (and the TypeSpec AcademicSubject enum) without forking editors.
 * Pilot creatable set is Mathematics only — no extra seed content required.
 */
export type AcademicSubject = NonNullable<AcademicPackageSummary['subject']>;

export interface ExamStructureDefaults {
  durationMinutes: number;
  totalPoints: number;
  questionCount: number;
  questionType: 'SINGLE_ANSWER';
  examLanguages: ExamLanguage[];
}

export interface SubjectProfile {
  subject: AcademicSubject;
  examStructure: ExamStructureDefaults;
}

export const SUBJECT_PROFILES: Record<AcademicSubject, SubjectProfile> = {
  MATHEMATICS: {
    subject: 'MATHEMATICS',
    examStructure: {
      durationMinutes: 60,
      totalPoints: 100,
      questionCount: 48,
      questionType: 'SINGLE_ANSWER',
      examLanguages: ['en', 'zh-CN'],
    },
  },
};

export const SUPPORTED_SUBJECTS = Object.keys(SUBJECT_PROFILES) as AcademicSubject[];

export function subjectProfile(subject: string | undefined): SubjectProfile {
  if (subject && subject in SUBJECT_PROFILES) {
    return SUBJECT_PROFILES[subject as AcademicSubject];
  }
  return SUBJECT_PROFILES.MATHEMATICS;
}

/** Subjects that do not yet have a package row. */
export function creatableSubjects(
  packages: readonly Pick<AcademicPackageSummary, 'subject'>[],
): AcademicSubject[] {
  const present = new Set(packages.map((pkg) => pkg.subject));
  return SUPPORTED_SUBJECTS.filter((subject) => !present.has(subject));
}

export function defaultExamStructure(subject: string | undefined): ExamStructureDefaults {
  return { ...subjectProfile(subject).examStructure };
}

/** Merge missing exam-structure fields from the subject profile without clobbering edits. */
export function ensureExamStructure(
  syllabus: OfficialSyllabus,
  subject: string | undefined = syllabus.subject,
): ExamStructureDefaults {
  const defaults = defaultExamStructure(subject);
  const current = syllabus.examStructure;
  return {
    durationMinutes: current?.durationMinutes ?? defaults.durationMinutes,
    totalPoints: current?.totalPoints ?? defaults.totalPoints,
    questionCount: current?.questionCount ?? defaults.questionCount,
    questionType: current?.questionType ?? defaults.questionType,
    examLanguages: current?.examLanguages ?? [...defaults.examLanguages],
  };
}
