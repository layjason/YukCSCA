import { describe, expect, test } from 'vitest';
import {
  creatableSubjects,
  defaultExamStructure,
  ensureExamStructure,
  subjectProfile,
} from './subjectProfile';

describe('subjectProfile', () => {
  test('Mathematics profile carries CSCA 2025 default exam structure', () => {
    const profile = subjectProfile('MATHEMATICS');
    expect(profile.examStructure).toEqual({
      durationMinutes: 60,
      totalPoints: 100,
      questionCount: 48,
      questionType: 'SINGLE_ANSWER',
      examLanguages: ['en', 'zh-CN'],
    });
  });

  test('creatableSubjects excludes subjects that already have a package', () => {
    expect(creatableSubjects([])).toEqual(['MATHEMATICS']);
    expect(creatableSubjects([{ subject: 'MATHEMATICS' }])).toEqual([]);
  });

  test('ensureExamStructure fills missing fields from the subject profile', () => {
    const structure = ensureExamStructure(
      {
        subject: 'MATHEMATICS',
        examStructure: { durationMinutes: 90 },
      },
      'MATHEMATICS',
    );
    expect(structure?.durationMinutes).toBe(90);
    expect(structure?.totalPoints).toBe(100);
    expect(structure?.questionCount).toBe(48);
  });

  test('defaultExamStructure returns a copy of profile defaults', () => {
    const a = defaultExamStructure('MATHEMATICS');
    const b = defaultExamStructure('MATHEMATICS');
    a.durationMinutes = 1;
    expect(b.durationMinutes).toBe(60);
  });
});
