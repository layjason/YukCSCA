import { describe, expect, test } from 'vitest';
import {
  normalizeOfficialDate,
  normalizeOfficialSyllabus,
  notStatedOfficialDate,
} from './officialSyllabusNormalize';

describe('normalizeOfficialDate', () => {
  test('missing or empty becomes explicit NOT_STATED with null date', () => {
    expect(normalizeOfficialDate(undefined)).toEqual(notStatedOfficialDate());
    expect(normalizeOfficialDate(null)).toEqual(notStatedOfficialDate());
    expect(normalizeOfficialDate({})).toEqual(notStatedOfficialDate());
  });

  test('NOT_STATED clears any leftover date', () => {
    expect(normalizeOfficialDate({ status: 'NOT_STATED', date: '2025-01-01' })).toEqual({
      status: 'NOT_STATED',
      date: null,
    });
  });

  test('DECLARED keeps status and date', () => {
    expect(normalizeOfficialDate({ status: 'DECLARED', date: '2025-06-01' })).toEqual({
      status: 'DECLARED',
      date: '2025-06-01',
    });
  });
});

describe('normalizeOfficialSyllabus', () => {
  test('fills all three official date fields when absent', () => {
    const result = normalizeOfficialSyllabus({
      subject: 'MATHEMATICS',
      authority: 'CSCA',
    });
    expect(result.publishedOn).toEqual(notStatedOfficialDate());
    expect(result.effectiveOn).toEqual(notStatedOfficialDate());
    expect(result.updatedOn).toEqual(notStatedOfficialDate());
  });
});
