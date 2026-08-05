import { describe, expect, test } from 'vitest';
import {
  fieldErrorsFromMapped,
  firstTabFromMapped,
  mapValidationViolations,
} from './validationMapping';

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
    const mapped = mapValidationViolations([
      { path: 'draft.outlineItems', code: 'REQUIRED' },
    ]);
    expect(mapped[0]?.tab).toBe('source');
    expect(mapped[0]?.field).toBe('outline');
  });

  test('maps questions to questions tab', () => {
    const mapped = mapValidationViolations([
      { path: 'draft.questions', code: 'OUT_OF_RANGE' },
    ]);
    expect(mapped[0]?.tab).toBe('questions');
    expect(firstTabFromMapped(mapped)).toBe('questions');
  });

  test('fieldErrorsFromMapped localizes first error per field', () => {
    const mapped = mapValidationViolations([
      { path: 'draft.officialSyllabus.publishedOn.status', code: 'UNSUPPORTED' },
      { path: 'draft.outlineItems', code: 'REQUIRED' },
    ]);
    const errors = fieldErrorsFromMapped(mapped, (key) => key);
    expect(errors.publishedOn).toBe('admin.academic.validation.fields.officialDateStatus');
    expect(errors.outline).toBe('admin.academic.validation.fields.outline');
  });
});
