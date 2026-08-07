import { describe, expect, test } from 'vitest';
import {
  fieldErrorsFromMapped,
  firstTabFromMapped,
  mapValidationViolations,
  messageKeyFor,
  shortValidationPath,
} from './validationMapping';

describe('messageKeyFor', () => {
  test('maps collection-level publish rules without collapsing nested content errors', () => {
    expect(messageKeyFor('draft.resources', 'REQUIRED')).toBe('resourcesKinds');
    expect(messageKeyFor('draft.resources[2].versions[0].blocks[1].latex', 'UNSUPPORTED')).toBe(
      'latexUnsafe',
    );
    expect(messageKeyFor('draft.questions', 'OUT_OF_RANGE')).toBe('questionsCount');
    expect(messageKeyFor('draft.mocks', 'OUT_OF_RANGE')).toBe('mockCount');
    expect(messageKeyFor('draft.officialSyllabus.permittedUse', 'INCOMPATIBLE')).toBe(
      'permittedUse',
    );
  });

  test('maps nested outline, objective, question, and mock paths', () => {
    expect(messageKeyFor('draft.outlineItems[0].parentId', 'INCOMPATIBLE')).toBe('outlineParent');
    expect(messageKeyFor('draft.outlineItems[0].sourcePosition', 'REQUIRED')).toBe(
      'outlineSourcePosition',
    );
    expect(messageKeyFor('draft.learningObjectives[0].mappings', 'REQUIRED')).toBe(
      'objectiveMappings',
    );
    expect(
      messageKeyFor('draft.learningObjectives[0].mappings[0].outlineItemId', 'INCOMPATIBLE'),
    ).toBe('objectiveOutlineRef');
    expect(messageKeyFor('draft.questions[0].options', 'OUT_OF_RANGE')).toBe('questionOptions');
    expect(messageKeyFor('draft.questions[0].correctOptionKey', 'INCOMPATIBLE')).toBe(
      'correctOptionMismatch',
    );
    expect(messageKeyFor('draft.mocks[0].questions', 'OUT_OF_RANGE')).toBe('mockQuestionsCount');
    expect(messageKeyFor('draft.mocks[0].totalPoints', 'INCOMPATIBLE')).toBe('mockTotalPoints');
    expect(messageKeyFor('draft.mocks[0].questions[1].questionId', 'DUPLICATE')).toBe(
      'mockQuestionDuplicate',
    );
  });

  test('maps provenance and latex length codes', () => {
    expect(messageKeyFor('draft.resources[0].provenance', 'MISSING_PERMISSION')).toBe(
      'provenancePermission',
    );
    expect(messageKeyFor('draft.resources[0].provenance.origin', 'UNSUPPORTED')).toBe(
      'provenanceOrigin',
    );
    expect(messageKeyFor('draft.resources[0].versions[0].blocks[0].latex', 'OUT_OF_RANGE')).toBe(
      'latexTooLong',
    );
    expect(messageKeyFor('draft.resources[0].versions[0].blocks[0].imageId', 'INCOMPATIBLE')).toBe(
      'imageMissing',
    );
  });
});

describe('mapValidationViolations', () => {
  test('maps official date status failure to source tab and publishedOn field', () => {
    const mapped = mapValidationViolations([
      {
        path: 'draft.officialSyllabus.publishedOn.status',
        code: 'UNSUPPORTED',
      },
    ]);
    expect(mapped[0]?.tab).toBe('source');
    expect(mapped[0]?.field).toBe('publishedOn');
    expect(mapped[0]?.messageKey).toBe('officialDateStatus');
  });

  test('maps outline required to source tab outline field', () => {
    const mapped = mapValidationViolations([{ path: 'draft.outlineItems', code: 'REQUIRED' }]);
    expect(mapped[0]?.tab).toBe('source');
    expect(mapped[0]?.field).toBe('outline');
    expect(mapped[0]?.messageKey).toBe('outline');
  });

  test('maps questions to questions tab with count message', () => {
    const mapped = mapValidationViolations([{ path: 'draft.questions', code: 'OUT_OF_RANGE' }]);
    expect(mapped[0]?.tab).toBe('questions');
    expect(mapped[0]?.messageKey).toBe('questionsCount');
    expect(firstTabFromMapped(mapped)).toBe('questions');
  });

  test('maps product-review multi-violation payload without misleading resource kinds copy', () => {
    const mapped = mapValidationViolations([
      { path: 'draft.officialSyllabus.permittedUse', code: 'INCOMPATIBLE' },
      { path: 'draft.resources[2].versions[0].blocks[1].latex', code: 'UNSUPPORTED' },
      { path: 'draft.questions', code: 'OUT_OF_RANGE' },
      { path: 'draft.mocks', code: 'OUT_OF_RANGE' },
    ]);

    expect(mapped.map((item) => item.messageKey)).toEqual([
      'permittedUse',
      'latexUnsafe',
      'questionsCount',
      'mockCount',
    ]);
    expect(mapped.map((item) => item.tab)).toEqual(['source', 'resources', 'questions', 'mock']);
    expect(mapped[1]?.field).toBe('resources');
    expect(shortValidationPath(mapped[1]!.path)).toBe('resources[2].versions[0].blocks[1].latex');
  });

  test('fieldErrorsFromMapped keeps multiple distinct resource messages', () => {
    const mapped = mapValidationViolations([
      { path: 'draft.resources', code: 'REQUIRED' },
      { path: 'draft.resources[0].versions[0].blocks[0].latex', code: 'UNSUPPORTED' },
      { path: 'draft.officialSyllabus.publishedOn.status', code: 'UNSUPPORTED' },
    ]);
    const errors = fieldErrorsFromMapped(mapped, (key) => key);
    expect(errors.resources).toEqual([
      'admin.academic.validation.fields.resourcesKinds',
      'admin.academic.validation.fields.latexUnsafe',
    ]);
    expect(errors.publishedOn).toEqual(['admin.academic.validation.fields.officialDateStatus']);
  });
});
