import type { OfficialSyllabus } from './types';
import type { components } from '@/shared/api/generated/openapi';

type OfficialDate = components['schemas']['AcademicAdmin.OfficialDate'];
type OfficialDateStatus = components['schemas']['AcademicAdmin.OfficialDateStatus'];

/** Explicit NOT_STATED payload the backend accepts without a calendar date. */
export function notStatedOfficialDate(): OfficialDate {
  return { status: 'NOT_STATED', date: null };
}

/**
 * Backend rejects missing official-date objects (empty status → UNSUPPORTED).
 * UI previously displayed "Not stated" without writing the object until the
 * admin toggled Declared → Not stated. Normalize so load/save always send
 * an explicit status.
 */
export function normalizeOfficialDate(value: OfficialDate | null | undefined): OfficialDate {
  const status = value?.status as OfficialDateStatus | undefined;
  if (status === 'DECLARED') {
    return { status: 'DECLARED', date: value?.date ?? null };
  }
  // Missing, unknown, or NOT_STATED → explicit NOT_STATED with null date.
  return notStatedOfficialDate();
}

export function normalizeOfficialSyllabus(syllabus: OfficialSyllabus): OfficialSyllabus {
  return {
    ...syllabus,
    // Backend requireExact(REFERENCE_ONLY); empty/missing → INCOMPATIBLE on publish.
    permittedUse: 'REFERENCE_ONLY',
    publishedOn: normalizeOfficialDate(syllabus.publishedOn),
    effectiveOn: normalizeOfficialDate(syllabus.effectiveOn),
    updatedOn: normalizeOfficialDate(syllabus.updatedOn),
  };
}
