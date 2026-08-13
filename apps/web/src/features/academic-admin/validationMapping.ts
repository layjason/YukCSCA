import type { AcademicValidationViolation, AdminEditorTab } from './types';

export type OfficialFieldKey =
  | 'sourceLinks'
  | 'authority'
  | 'editionLabel'
  | 'retrievedAt'
  | 'lastCheckedAt'
  | 'publishedOn'
  | 'effectiveOn'
  | 'updatedOn'
  | 'examStructure'
  | 'permittedUse';

export type ValidationFieldKey =
  | OfficialFieldKey
  | 'outline'
  | 'objectives'
  | 'resources'
  | 'questions'
  | 'assessment'
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

const OFFICIAL_DATE_FIELDS: OfficialFieldKey[] = ['publishedOn', 'effectiveOn', 'updatedOn'];

/** Last path segment without array indices, e.g. blocks[1].latex → latex */
function pathLeaf(path: string): string {
  const segments = path.split('.').filter(Boolean);
  const last = segments[segments.length - 1] ?? path;
  return last.replace(/\[\d+\]/g, '').toLowerCase();
}

function pathWithoutDraft(path: string): string {
  return path.replace(/^draft\./i, '');
}

function pathIncludes(path: string, fragment: string): boolean {
  return path.toLowerCase().includes(fragment.toLowerCase());
}

/**
 * Map backend path + AcademicViolationCode to a specific i18n message key.
 * Paths and codes follow AcademicDraftProcessor / AcademicAdminService.
 */
export function messageKeyFor(path: string, code: string): string {
  const lower = path.toLowerCase();
  const leaf = pathLeaf(path);
  const normalizedCode = code.toUpperCase();

  // --- Official syllabus dates ---
  if (OFFICIAL_DATE_FIELDS.some((f) => lower.includes(f.toLowerCase()))) {
    if (normalizedCode === 'INVALID' || normalizedCode === 'INCOMPATIBLE') {
      return 'officialDateDeclared';
    }
    return 'officialDateStatus';
  }

  // --- Official syllabus fields ---
  if (
    leaf === 'sourcelinks' ||
    pathIncludes(lower, 'sourcelinks') ||
    (pathIncludes(lower, 'officialsyllabus') && leaf === 'url')
  ) {
    if (normalizedCode === 'INVALID') return 'sourceLinkUrlInvalid';
    if (normalizedCode === 'DUPLICATE') return 'sourceLinkLanguageDuplicate';
    if (normalizedCode === 'UNSUPPORTED') return 'sourceLinkLanguage';
    if (normalizedCode === 'OUT_OF_RANGE') return 'sourceLinksRange';
    if (leaf === 'url' || pathIncludes(lower, '.url')) return 'sourceLinkUrl';
    if (leaf === 'language') return 'sourceLinkLanguage';
    return 'sourceLinks';
  }
  if (leaf === 'authority') return 'authority';
  if (leaf === 'editionlabel') return 'editionLabel';
  if (leaf === 'retrievedat') return 'retrievedAt';
  if (leaf === 'lastcheckedat') return 'lastCheckedAt';
  if (
    leaf === 'examstructure' ||
    pathIncludes(lower, 'examstructure') ||
    pathIncludes(lower, 'examlanguages')
  ) {
    if (leaf === 'durationminutes' || leaf === 'totalpoints' || leaf === 'questioncount') {
      return 'examStructureFixed';
    }
    if (leaf === 'questiontype') return 'examStructureFixed';
    return 'examStructure';
  }
  if (leaf === 'permitteduse') return 'permittedUse';
  if (leaf === 'subject' && pathIncludes(lower, 'officialsyllabus')) return 'subjectFixed';

  // --- Collection-level publish requirements (exact / near-exact paths) ---
  if (lower === 'draft.outlineitems' || lower === 'outlineitems') {
    return 'outline';
  }
  if (lower === 'draft.learningobjectives' || lower === 'learningobjectives') {
    return 'objectives';
  }
  if (lower === 'draft.resources' || lower === 'resources') {
    if (normalizedCode === 'REQUIRED') return 'resourcesKinds';
    return 'resourcesKinds';
  }
  if (lower === 'draft.questions' || lower === 'questions') {
    if (normalizedCode === 'OUT_OF_RANGE') return 'questionsCount';
    return 'questions';
  }
  if (lower === 'draft.mocks' || lower === 'mocks') {
    if (normalizedCode === 'OUT_OF_RANGE') return 'mockCount';
    return 'mock';
  }
  if (lower === 'draft.assessmentsets' || lower === 'assessmentsets') {
    return 'assessmentSets';
  }

  // --- Math / content blocks (must run before generic resources/questions) ---
  if (leaf === 'latex') {
    if (normalizedCode === 'UNSUPPORTED') return 'latexUnsafe';
    if (normalizedCode === 'OUT_OF_RANGE') return 'latexTooLong';
    if (normalizedCode === 'REQUIRED') return 'latexRequired';
    return 'latexUnsafe';
  }
  if (leaf === 'displaymode') return 'mathDisplayMode';
  if (leaf === 'imageid') return 'imageMissing';
  if (leaf === 'alttext') return 'imageAlt';
  if (leaf === 'caption') return 'imageCaption';
  if (leaf === 'text' && pathIncludes(lower, 'blocks')) {
    if (normalizedCode === 'OUT_OF_RANGE') return 'textTooLong';
    return 'textRequired';
  }
  if (leaf === 'kind' && pathIncludes(lower, 'blocks')) return 'blockKind';
  if (leaf === 'blocks') return 'contentBlocks';
  if (leaf === 'versions' || leaf === 'explanations') {
    if (pathIncludes(lower, 'explanations')) return 'questionExplanations';
    return 'contentVersions';
  }
  if (leaf === 'language') {
    if (normalizedCode === 'DUPLICATE') return 'languageDuplicate';
    return 'languageUnsupported';
  }

  // --- Outline item fields ---
  if (pathIncludes(lower, 'outlineitems')) {
    if (leaf === 'parentid') return 'outlineParent';
    if (leaf === 'sourceposition' || pathIncludes(lower, 'sourceposition')) {
      return 'outlineSourcePosition';
    }
    if (leaf === 'order') return 'outlineOrder';
    if (
      leaf === 'indonesian' ||
      leaf === 'english' ||
      leaf === 'simplifiedchinese' ||
      leaf === 'summary'
    ) {
      return 'outlineSummary';
    }
    if (leaf === 'id') return 'stableId';
    return codeFallback(normalizedCode);
  }

  // --- Learning objectives ---
  if (pathIncludes(lower, 'learningobjectives')) {
    if (leaf === 'mappings') return 'objectiveMappings';
    if (leaf === 'outlineitemid') return 'objectiveOutlineRef';
    if (leaf === 'rationale') return 'objectiveRationale';
    if (
      leaf === 'indonesian' ||
      leaf === 'english' ||
      leaf === 'simplifiedchinese' ||
      leaf === 'title'
    ) {
      return 'objectiveTitle';
    }
    if (leaf === 'id') return 'stableId';
    return codeFallback(normalizedCode);
  }

  // --- Study resources (nested) ---
  if (pathIncludes(lower, 'resources')) {
    if (leaf === 'kind') return 'resourceKind';
    if (leaf === 'outlineitemids') return 'resourceOutlineRefs';
    if (leaf === 'objectiveids') return 'resourceObjectiveRefs';
    if (
      leaf === 'indonesian' ||
      leaf === 'english' ||
      leaf === 'simplifiedchinese' ||
      leaf === 'title'
    ) {
      return 'resourceTitle';
    }
    if (leaf === 'origin' || leaf === 'provenance' || pathIncludes(lower, 'provenance')) {
      return provenanceMessage(leaf, normalizedCode);
    }
    if (leaf === 'id') return 'stableId';
    return codeFallback(normalizedCode);
  }

  // --- Assessment sets (before questions — paths share questionIds) ---
  if (pathIncludes(lower, 'assessmentsets')) {
    if (leaf === 'questionids' || pathIncludes(lower, 'questionids')) {
      return 'assessmentSetQuestions';
    }
    if (leaf === 'lessonresourceid') return 'assessmentSetLesson';
    if (leaf === 'examlanguage' && normalizedCode === 'DUPLICATE') {
      return 'assessmentSetLessonLanguageDuplicate';
    }
    if (leaf === 'examlanguage') return 'assessmentSetExamLanguage';
    if (leaf === 'purpose' || leaf === 'passpolicy' || leaf === 'feedbackmode') {
      return 'assessmentSets';
    }
    if (
      leaf === 'title' ||
      leaf === 'english' ||
      leaf === 'indonesian' ||
      leaf === 'simplifiedchinese'
    ) {
      return 'assessmentSetTitle';
    }
    if (leaf === 'estimatedminutes') return 'assessmentSetMinutes';
    if (leaf === 'remediationresourceids') return 'assessmentSetRemediation';
    return 'assessmentSets';
  }

  // --- Questions (nested) ---
  if (pathIncludes(lower, 'questions') && !pathIncludes(lower, 'mocks')) {
    if (leaf === 'examlanguage') return 'examLanguage';
    if (leaf === 'difficulty') return 'questionDifficulty';
    if (leaf === 'options') return 'questionOptions';
    if (leaf === 'key' && pathIncludes(lower, 'options')) {
      if (normalizedCode === 'DUPLICATE') return 'optionKeyDuplicate';
      return 'optionKey';
    }
    if (leaf === 'correctoptionkey') {
      if (normalizedCode === 'INCOMPATIBLE') return 'correctOptionMismatch';
      return 'correctOption';
    }
    if (leaf === 'stem') return 'questionStem';
    if (leaf === 'outlineitemids') return 'questionOutlineRefs';
    if (leaf === 'objectiveids') return 'questionObjectiveRefs';
    if (leaf === 'hinttiers' || pathIncludes(lower, 'hinttiers')) return 'hintTiers';
    if (leaf === 'origin' || leaf === 'provenance' || pathIncludes(lower, 'provenance')) {
      return provenanceMessage(leaf, normalizedCode);
    }
    if (leaf === 'id') return 'stableId';
    return codeFallback(normalizedCode);
  }

  // --- Mock paper ---
  if (pathIncludes(lower, 'mocks')) {
    if (leaf === 'questions' || (leaf === '' && pathIncludes(lower, 'questions'))) {
      // draft.mocks[0].questions
      if (normalizedCode === 'OUT_OF_RANGE') return 'mockQuestionsCount';
    }
    if (pathIncludes(lower, '.questions') && leaf === 'questions') {
      return 'mockQuestionsCount';
    }
    if (leaf === 'questionid') {
      if (normalizedCode === 'DUPLICATE') return 'mockQuestionDuplicate';
      return 'mockQuestionRef';
    }
    if (leaf === 'points') return 'mockQuestionPoints';
    if (leaf === 'totalpoints') return 'mockTotalPoints';
    if (leaf === 'durationminutes' || leaf === 'questioncount' || leaf === 'questiontype') {
      return 'mockStructureFixed';
    }
    if (leaf === 'examlanguage') return 'examLanguage';
    if (leaf === 'title') return 'mockTitle';
    if (leaf === 'origin' || leaf === 'provenance' || pathIncludes(lower, 'provenance')) {
      return provenanceMessage(leaf, normalizedCode);
    }
    if (leaf === 'id') return 'stableId';
    return codeFallback(normalizedCode);
  }

  // --- Localized text leftover ---
  if (leaf === 'indonesian' || leaf === 'english' || leaf === 'simplifiedchinese') {
    return 'localizedText';
  }

  // --- Provenance / top-level ops ---
  if (leaf === 'origin' || leaf === 'provenance' || pathIncludes(lower, 'provenance')) {
    return provenanceMessage(leaf, normalizedCode);
  }
  if (leaf === 'reason') return 'archiveReason';
  if (leaf === 'file') {
    if (normalizedCode === 'OUT_OF_RANGE') return 'imageFileSize';
    if (normalizedCode === 'UNSUPPORTED') return 'imageFileType';
    return 'imageFileInvalid';
  }
  if (leaf === 'subject') return 'subjectFixed';
  if (leaf === 'expecteddraftrevision' || normalizedCode === 'STALE_REVISION') {
    return 'staleRevision';
  }
  if (lower === 'draft') {
    if (normalizedCode === 'REQUIRED') return 'draftRequired';
    if (normalizedCode === 'OUT_OF_RANGE') return 'draftTooLarge';
  }

  return codeFallback(normalizedCode);
}

function provenanceMessage(leaf: string, code: string): string {
  if (leaf === 'origin' || code === 'UNSUPPORTED') return 'provenanceOrigin';
  if (code === 'MISSING_PERMISSION') return 'provenancePermission';
  return 'provenancePermission';
}

function codeFallback(code: string): string {
  switch (code) {
    case 'REQUIRED':
      return 'required';
    case 'INVALID':
      return 'invalid';
    case 'OUT_OF_RANGE':
      return 'outOfRange';
    case 'UNSUPPORTED':
      return 'unsupported';
    case 'INCOMPATIBLE':
      return 'incompatible';
    case 'DUPLICATE':
      return 'duplicate';
    case 'MISSING_PERMISSION':
      return 'provenancePermission';
    case 'STALE_REVISION':
      return 'staleRevision';
    default:
      return 'generic';
  }
}

export function fieldFor(path: string): ValidationFieldKey {
  const lower = path.toLowerCase();
  for (const f of OFFICIAL_DATE_FIELDS) {
    if (lower.includes(f.toLowerCase())) return f;
  }
  if (
    lower.includes('sourcelinks') ||
    (lower.includes('officialsyllabus') && lower.includes('.url'))
  ) {
    return 'sourceLinks';
  }
  if (lower.includes('authority')) return 'authority';
  if (lower.includes('editionlabel')) return 'editionLabel';
  if (lower.includes('retrievedat')) return 'retrievedAt';
  if (lower.includes('lastcheckedat')) return 'lastCheckedAt';
  if (lower.includes('examstructure') || lower.includes('examlanguages')) {
    return 'examStructure';
  }
  if (lower.includes('permitteduse')) return 'permittedUse';
  if (lower.includes('outlineitems')) return 'outline';
  if (lower.includes('learningobjectives')) return 'objectives';
  // Resource-owned content paths (blocks under resources)
  if (lower.includes('resources')) return 'resources';
  if (lower.includes('assessmentsets')) return 'assessment';
  // Question stem/options/explanations (not mock.questions)
  if (lower.includes('questions') && !lower.includes('mocks')) return 'questions';
  if (lower.includes('mocks')) return 'mock';
  if (lower.includes('subject')) return 'general';
  return 'general';
}

/** Outline lives on the Source & outline tab in the UI. */
export function tabFor(field: ValidationFieldKey): AdminEditorTab {
  switch (field) {
    case 'outline':
    case 'sourceLinks':
    case 'authority':
    case 'editionLabel':
    case 'retrievedAt':
    case 'lastCheckedAt':
    case 'publishedOn':
    case 'effectiveOn':
    case 'updatedOn':
    case 'examStructure':
    case 'permittedUse':
      return 'source';
    case 'objectives':
      return 'objectives';
    case 'resources':
      return 'resources';
    case 'questions':
      return 'questions';
    case 'assessment':
      return 'assessment';
    case 'mock':
      return 'mock';
    default:
      return 'source';
  }
}

/** Compact path for admin display (no draft. prefix). Prefer humanLocationLabel in UI. */
export function shortValidationPath(path: string): string {
  return pathWithoutDraft(path);
}

/** 0-based index of assessmentSets[n] in a violation path, or null. */
export function assessmentSetIndexFromPath(path: string): number | null {
  const match = path.match(/assessment[Ss]ets\[(\d+)\]/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
}

/** 0-based index of draft.questions[n] (not mock.questions / assessmentSets.questionIds). */
export function questionIndexFromPath(path: string): number | null {
  const lower = path.toLowerCase();
  if (lower.includes('assessmentsets') || lower.includes('mocks')) return null;
  const match = path.match(/questions\[(\d+)\]/i);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
}

/** 0-based outline item index when path points at outlineItems[n]. */
export function outlineIndexFromPath(path: string): number | null {
  const match = path.match(/outline[Ii]tems\[(\d+)\]/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
}

export interface ValidationLocationContext {
  /** Display titles for assessmentSets by index (may be empty). */
  assessmentSetLabels?: readonly (string | null | undefined)[];
  /** Display labels for questions by index. */
  questionLabels?: readonly (string | null | undefined)[];
  /** Display labels for outline items by index. */
  outlineLabels?: readonly (string | null | undefined)[];
}

/**
 * Human-readable location for admins (no JSON path indices).
 * Example: "Assessment set 2 · Linked lesson" instead of assessmentSets[1].lessonResourceId.
 */
// Loose i18n adapter — callers pass react-i18next `t` without fighting TFunction generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocationTranslate = (key: string, options?: any) => string;

export function humanLocationLabel(
  path: string,
  t: LocationTranslate,
  ctx: ValidationLocationContext = {},
): string {
  const leaf = pathLeaf(path);
  const setIndex = assessmentSetIndexFromPath(path);
  if (setIndex != null) {
    const named = ctx.assessmentSetLabels?.[setIndex]?.trim();
    const setLabel =
      named && named.length > 0
        ? named
        : t('admin.academic.validation.location.assessmentSetN', { n: setIndex + 1 });
    const part = assessmentFieldPart(leaf, t);
    return part
      ? t('admin.academic.validation.location.joined', { place: setLabel, part })
      : setLabel;
  }

  const questionIndex = questionIndexFromPath(path);
  if (questionIndex != null) {
    const named = ctx.questionLabels?.[questionIndex]?.trim();
    const qLabel =
      named && named.length > 0
        ? named
        : t('admin.academic.validation.location.questionN', { n: questionIndex + 1 });
    const part = questionFieldPart(leaf, path, t);
    return part ? t('admin.academic.validation.location.joined', { place: qLabel, part }) : qLabel;
  }

  const outlineIndex = outlineIndexFromPath(path);
  if (outlineIndex != null) {
    const named = ctx.outlineLabels?.[outlineIndex]?.trim();
    const oLabel =
      named && named.length > 0
        ? named
        : t('admin.academic.validation.location.outlineN', { n: outlineIndex + 1 });
    return oLabel;
  }

  if (pathIncludes(path.toLowerCase(), 'learningobjectives')) {
    return t('admin.academic.validation.location.objectives');
  }
  if (pathIncludes(path.toLowerCase(), 'resources')) {
    return t('admin.academic.validation.location.resources');
  }
  if (pathIncludes(path.toLowerCase(), 'mocks')) {
    return t('admin.academic.validation.location.mock');
  }
  if (
    pathIncludes(path.toLowerCase(), 'officialsyllabus') ||
    pathIncludes(path.toLowerCase(), 'sourcelinks')
  ) {
    return t('admin.academic.validation.location.source');
  }
  if (pathIncludes(path.toLowerCase(), 'outlineitems')) {
    return t('admin.academic.validation.location.outline');
  }
  if (pathIncludes(path.toLowerCase(), 'assessmentsets')) {
    return t('admin.academic.validation.location.assessment');
  }
  if (pathIncludes(path.toLowerCase(), 'questions')) {
    return t('admin.academic.validation.location.questions');
  }
  return t('admin.academic.validation.location.general');
}

function assessmentFieldPart(leaf: string, t: LocationTranslate): string | null {
  switch (leaf) {
    case 'lessonresourceid':
      return t('admin.academic.validation.location.parts.lesson');
    case 'questionids':
      return t('admin.academic.validation.location.parts.questions');
    case 'examlanguage':
      return t('admin.academic.validation.location.parts.examLanguage');
    case 'title':
    case 'english':
    case 'indonesian':
    case 'simplifiedchinese':
      return t('admin.academic.validation.location.parts.title');
    case 'purpose':
      return t('admin.academic.validation.location.parts.purpose');
    case 'passpolicy':
      return t('admin.academic.validation.location.parts.passPolicy');
    case 'feedbackmode':
      return t('admin.academic.validation.location.parts.feedbackMode');
    case 'estimatedminutes':
      return t('admin.academic.validation.location.parts.minutes');
    case 'remediationresourceids':
      return t('admin.academic.validation.location.parts.remediation');
    default:
      return null;
  }
}

function questionFieldPart(leaf: string, path: string, t: LocationTranslate): string | null {
  if (pathIncludes(path.toLowerCase(), 'hinttiers')) {
    return t('admin.academic.validation.location.parts.hints');
  }
  switch (leaf) {
    case 'stem':
      return t('admin.academic.validation.location.parts.stem');
    case 'options':
    case 'key':
      return t('admin.academic.validation.location.parts.options');
    case 'correctoptionkey':
      return t('admin.academic.validation.location.parts.correctOption');
    case 'examlanguage':
      return t('admin.academic.validation.location.parts.examLanguage');
    case 'explanations':
      return t('admin.academic.validation.location.parts.explanations');
    case 'latex':
      return t('admin.academic.validation.location.parts.math');
    default:
      return null;
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

export function localizeMappedMessage(item: MappedValidation, t: (key: string) => string): string {
  return t(`admin.academic.validation.fields.${item.messageKey}`);
}

/** Indexes of assessment sets that have at least one mapped violation. */
export function assessmentSetErrorIndexes(mapped: readonly MappedValidation[]): number[] {
  const indexes = new Set<number>();
  for (const item of mapped) {
    const index = assessmentSetIndexFromPath(item.path);
    if (index != null) indexes.add(index);
  }
  return [...indexes].sort((a, b) => a - b);
}

/** Indexes of questions that have at least one mapped violation. */
export function questionErrorIndexes(mapped: readonly MappedValidation[]): number[] {
  const indexes = new Set<number>();
  for (const item of mapped) {
    const index = questionIndexFromPath(item.path);
    if (index != null) indexes.add(index);
  }
  return [...indexes].sort((a, b) => a - b);
}

/**
 * All unique messages per field (order preserved). Multiple resource issues no
 * longer collapse into a single misleading “missing kinds” string.
 */
export function fieldErrorsFromMapped(
  mapped: MappedValidation[],
  t: (key: string) => string,
): Partial<Record<ValidationFieldKey, string[]>> {
  const out: Partial<Record<ValidationFieldKey, string[]>> = {};
  for (const item of mapped) {
    const msg = localizeMappedMessage(item, t);
    const list = out[item.field] ?? [];
    if (!list.includes(msg)) {
      list.push(msg);
    }
    out[item.field] = list;
  }
  return out;
}

export function firstTabFromMapped(mapped: MappedValidation[]): AdminEditorTab {
  return mapped[0]?.tab ?? 'source';
}
