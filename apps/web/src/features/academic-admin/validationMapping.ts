import type { AcademicValidationViolation, AdminEditorTab } from './types';

export type OfficialFieldKey =
  | 'sourceUrl'
  | 'authority'
  | 'editionLabel'
  | 'retrievedAt'
  | 'lastCheckedAt'
  | 'publishedOn'
  | 'effectiveOn'
  | 'updatedOn'
  | 'sourceLanguages'
  | 'examStructure'
  | 'permittedUse';

export type ValidationFieldKey =
  | OfficialFieldKey
  | 'outline'
  | 'objectives'
  | 'resources'
  | 'questions'
  | 'mock'
  | 'general';

export interface MappedValidation {
  tab: AdminEditorTab;
  field: ValidationFieldKey;
  /** i18n key under admin.academic.validation.fields.* */
  messageKey: string;
  path: string;
  code: string;
}

const OFFICIAL_DATE_FIELDS: OfficialFieldKey[] = [
  'publishedOn',
  'effectiveOn',
  'updatedOn',
];

function messageKeyFor(path: string, code: string): string {
  const lower = path.toLowerCase();

  if (OFFICIAL_DATE_FIELDS.some((f) => lower.includes(f.toLowerCase()))) {
    if (code === 'INVALID' || code === 'INCOMPATIBLE') {
      return 'officialDateDeclared';
    }
    return 'officialDateStatus';
  }

  if (lower.includes('sourceurl')) return 'sourceUrl';
  if (lower.includes('authority')) return 'authority';
  if (lower.includes('editionlabel')) return 'editionLabel';
  if (lower.includes('retrievedat')) return 'retrievedAt';
  if (lower.includes('lastcheckedat')) return 'lastCheckedAt';
  if (lower.includes('sourcelanguages')) return 'sourceLanguages';
  if (lower.includes('examstructure') || lower.includes('examlanguages')) {
    return 'examStructure';
  }
  if (lower.includes('permitteduse')) return 'permittedUse';
  if (lower.includes('outlineitems')) return 'outline';
  if (lower.includes('learningobjectives')) return 'objectives';
  if (lower.includes('resources')) return 'resources';
  if (lower.includes('questions')) return 'questions';
  if (lower.includes('mocks')) return 'mock';

  if (code === 'REQUIRED') return 'required';
  if (code === 'INVALID') return 'invalid';
  return 'generic';
}

function fieldFor(path: string): ValidationFieldKey {
  const lower = path.toLowerCase();
  for (const f of OFFICIAL_DATE_FIELDS) {
    if (lower.includes(f.toLowerCase())) return f;
  }
  if (lower.includes('sourceurl')) return 'sourceUrl';
  if (lower.includes('authority')) return 'authority';
  if (lower.includes('editionlabel')) return 'editionLabel';
  if (lower.includes('retrievedat')) return 'retrievedAt';
  if (lower.includes('lastcheckedat')) return 'lastCheckedAt';
  if (lower.includes('sourcelanguages')) return 'sourceLanguages';
  if (lower.includes('examstructure') || lower.includes('examlanguages')) {
    return 'examStructure';
  }
  if (lower.includes('permitteduse')) return 'permittedUse';
  if (lower.includes('outlineitems')) return 'outline';
  if (lower.includes('learningobjectives')) return 'objectives';
  if (lower.includes('resources')) return 'resources';
  if (lower.includes('questions')) return 'questions';
  if (lower.includes('mocks')) return 'mock';
  return 'general';
}

/** Outline lives on the Source & outline tab in the UI. */
function tabFor(field: ValidationFieldKey): AdminEditorTab {
  switch (field) {
    case 'outline':
    case 'sourceUrl':
    case 'authority':
    case 'editionLabel':
    case 'retrievedAt':
    case 'lastCheckedAt':
    case 'publishedOn':
    case 'effectiveOn':
    case 'updatedOn':
    case 'sourceLanguages':
    case 'examStructure':
    case 'permittedUse':
      return 'source';
    case 'objectives':
      return 'objectives';
    case 'resources':
      return 'resources';
    case 'questions':
      return 'questions';
    case 'mock':
      return 'mock';
    default:
      return 'source';
  }
}

export function mapValidationViolations(
  violations: AcademicValidationViolation[],
): MappedValidation[] {
  return violations.map((v) => {
    const field = fieldFor(v.path);
    return {
      tab: tabFor(field),
      field,
      messageKey: messageKeyFor(v.path, v.code),
      path: v.path,
      code: v.code,
    };
  });
}

/** First field error wins for a given field key. */
export function fieldErrorsFromMapped(
  mapped: MappedValidation[],
  t: (key: string) => string,
): Partial<Record<ValidationFieldKey, string>> {
  const out: Partial<Record<ValidationFieldKey, string>> = {};
  for (const item of mapped) {
    if (out[item.field]) continue;
    out[item.field] = t(`admin.academic.validation.fields.${item.messageKey}`);
  }
  return out;
}

export function firstTabFromMapped(mapped: MappedValidation[]): AdminEditorTab {
  return mapped[0]?.tab ?? 'source';
}
