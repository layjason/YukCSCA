import type {
  BookmarkLessonTermsResult,
  BookmarkTermRequest,
  BookmarkTermResult,
  ExplanationLanguage,
  NotebookEntry,
  NotebookEntryDetail,
  NotebookListResponseBody,
  PreviewCheckResult,
  PreviewProgress,
  TermCard,
  TermLookupRequest,
  TermLookupResult,
  TerminologyPreview,
  TermReviewResult,
} from '@/shared/terminology/types';

export const TERM_DEV_IDS = {
  PACKAGE_ID: '00000000-0000-4000-8000-0000000000a1',
  REVISION_ID: '00000000-0000-4000-8000-0000000000a2',
  PREVIEW_ID: '00000000-0000-4000-8000-0000000000c2',
  LESSON_ID: '00000000-0000-4000-8000-0000000000c1',
  TERM_FACTOR: '00000000-0000-4000-8000-0000000000t1',
  TERM_INCREASING: '00000000-0000-4000-8000-0000000000t2',
  TERM_FIND: '00000000-0000-4000-8000-0000000000t3',
} as const;

const progressByPreview = new Map<string, PreviewProgress>();
const notebook = new Map<string, NotebookEntry>();

function now(): string {
  return new Date().toISOString();
}

function defaultProgress(): PreviewProgress {
  return {
    status: 'NOT_STARTED',
    updatedAt: null,
    requiredSetUpdatedSinceCompleted: false,
  };
}

function surface(text: string, pinyin: string, audioAvailable = false) {
  return { text, pinyin, audioAvailable };
}

function card(
  termId: string,
  termClass: TermCard['termClass'],
  text: string,
  pinyin: string,
  definition: string,
  english: string,
  language: ExplanationLanguage,
): TermCard {
  return {
    termId,
    subject: 'MATHEMATICS',
    packageId: TERM_DEV_IDS.PACKAGE_ID,
    termClass,
    alreadyInNotebook: notebook.has(termId),
    primarySurface: surface(text, pinyin, termId === TERM_DEV_IDS.TERM_FACTOR),
    aliases: [],
    definition: { availability: 'AVAILABLE', language, text: definition },
    englishEquivalent: english,
    symbols: null,
    example: null,
    outlineItemIds: [],
  };
}

function cardsFor(language: ExplanationLanguage): TermCard[] {
  return [
    card(
      TERM_DEV_IDS.TERM_FACTOR,
      'TOPIC_TERM',
      '公因式',
      'gōng yīn shì',
      language === 'id'
        ? 'Faktor persekutuan'
        : language === 'zh-CN'
          ? '几个整式公有的因式'
          : 'Common factor',
      'common factor',
      language,
    ),
    card(
      TERM_DEV_IDS.TERM_INCREASING,
      'TOPIC_TERM',
      '单调递增',
      'dān diào zēng zhǎng',
      language === 'id'
        ? 'Naik monoton'
        : language === 'zh-CN'
          ? '函数值随自变量增大而增大'
          : 'Monotonically increasing',
      'monotonically increasing',
      language,
    ),
    card(
      TERM_DEV_IDS.TERM_FIND,
      'EXAM_INSTRUCTION',
      '求',
      'qiú',
      language === 'id' ? 'Tentukan' : language === 'zh-CN' ? '求出' : 'Find',
      'find',
      language,
    ),
  ];
}

function upsertNotebook(
  cardValue: TermCard,
  source: NotebookEntry['sources'][number],
): NotebookEntry {
  const existing = notebook.get(cardValue.termId);
  const sources = existing
    ? existing.sources.includes(source)
      ? existing.sources
      : [...existing.sources, source]
    : [source];
  const entry: NotebookEntry = {
    termId: cardValue.termId,
    subject: cardValue.subject,
    packageId: cardValue.packageId,
    termClass: cardValue.termClass,
    primarySurface: cardValue.primarySurface,
    familiarity: existing?.familiarity ?? 'NEW',
    due: existing?.due ?? false,
    lastReviewAt: existing?.lastReviewAt ?? null,
    sources,
    metIn: {
      source,
      place: source === 'REQUIRED_COURSE' ? 'PREVIEW' : 'LESSON',
      topicTitle: {
        english: 'Factorisation',
        indonesian: 'Faktorisasi',
        simplifiedChinese: '因式分解',
      },
      outlineItemId: null,
      at: now(),
    },
    pendingReview: existing?.pendingReview ?? null,
  };
  notebook.set(cardValue.termId, entry);
  return entry;
}

export function devGetTerminologyPreview(
  subject: string,
  resourceId: string,
  explanationLanguage: ExplanationLanguage,
): TerminologyPreview | null {
  if (subject !== 'MATHEMATICS' || !isPreviewResource(resourceId)) return null;
  const terms = cardsFor(explanationLanguage);
  return {
    packageId: TERM_DEV_IDS.PACKAGE_ID,
    packageRevisionId: TERM_DEV_IDS.REVISION_ID,
    subject: 'MATHEMATICS',
    resourceId,
    title: {
      english: 'Required terms',
      indonesian: 'Istilah wajib',
      simplifiedChinese: '必学术语',
    },
    outlineItemIds: [],
    lessonResourceIds: [TERM_DEV_IDS.LESSON_ID],
    requestedExplanationLanguage: explanationLanguage,
    terms,
    matchingPairsAvailable: true,
    matchTargets: terms.map((term) => ({
      termId: term.termId,
      matchKey: term.termId,
      promptSurface: term.primarySurface.text,
      matchLabel: term.englishEquivalent,
    })),
    previewProgress: progressByPreview.get(resourceId) ?? defaultProgress(),
  };
}

export function devUpsertPreviewProgress(
  resourceId: string,
  status: PreviewProgress['status'],
): PreviewProgress | null {
  if (!isPreviewResource(resourceId)) return null;
  const next: PreviewProgress = {
    status,
    updatedAt: now(),
    requiredSetUpdatedSinceCompleted: false,
  };
  progressByPreview.set(resourceId, next);
  return next;
}

export function devSubmitPreviewCheck(
  resourceId: string,
  pairs: { termId: string; selectedMatchKey: string }[],
): PreviewCheckResult | null {
  if (!isPreviewResource(resourceId)) return null;
  const progress = devUpsertPreviewProgress(resourceId, 'IN_PROGRESS') ?? defaultProgress();
  const correctCount = pairs.filter((pair) => pair.selectedMatchKey === pair.termId).length;
  return {
    kind: 'MATCH_PAIRS',
    correctCount,
    totalCount: pairs.length,
    previewProgress: progress,
  };
}

export function devResolveTermLookup(request: TermLookupRequest): TermLookupResult {
  const language = request.explanationLanguage;
  const terms = cardsFor(language);
  const matched = request.termId
    ? terms.find((term) => term.termId === request.termId)
    : terms.find(
        (term) =>
          term.primarySurface.text === request.selectedText ||
          term.aliases.some((alias) => alias.text === request.selectedText),
      );
  if (!matched) {
    return { outcome: 'NOT_IN_BANK' };
  }
  const already = notebook.has(matched.termId);
  return {
    outcome: 'MATCHED',
    card: { ...matched, alreadyInNotebook: already },
    alreadyInNotebook: already,
    entry: already ? notebook.get(matched.termId)! : null,
  };
}

function isPreviewResource(resourceId: string): boolean {
  return resourceId === TERM_DEV_IDS.LESSON_ID || resourceId === TERM_DEV_IDS.PREVIEW_ID;
}

export function devBookmarkTerm(termId: string, request: BookmarkTermRequest): BookmarkTermResult {
  const language = request.explanationLanguage;
  const matched = cardsFor(language).find((term) => term.termId === termId);
  if (!matched) {
    throw new Error('Term not found');
  }
  const source = request.source === 'LANGUAGE_MISTAKE' ? 'LANGUAGE_MISTAKE' : 'CLICKED';
  const entry = upsertNotebook(matched, source);
  return {
    card: { ...matched, alreadyInNotebook: true },
    alreadyInNotebook: true,
    entry,
  };
}

export function devUnbookmarkTerm(termId: string): void {
  notebook.delete(termId);
}

export function devBookmarkLessonTerms(
  resourceId: string,
  termIds?: readonly string[],
): BookmarkLessonTermsResult {
  if (!isPreviewResource(resourceId)) return { termIds: [] };
  const terms = cardsFor('en');
  const wanted = termIds && termIds.length > 0 ? new Set(termIds) : null;
  const bookmarked: string[] = [];
  for (const term of terms) {
    if (wanted && !wanted.has(term.termId)) continue;
    upsertNotebook(term, 'CLICKED');
    bookmarked.push(term.termId);
  }
  return { termIds: bookmarked };
}

export function devListTerminologyNotebook(options: {
  dueOnly?: boolean;
  q?: string;
  classGroup?: 'EXAM_WORDING' | 'TOPIC_TERM';
}): NotebookListResponseBody {
  let items = [...notebook.values()];
  if (options.dueOnly) items = items.filter((item) => item.due);
  if (options.classGroup === 'TOPIC_TERM') {
    items = items.filter((item) => item.termClass === 'TOPIC_TERM');
  } else if (options.classGroup === 'EXAM_WORDING') {
    items = items.filter((item) => item.termClass !== 'TOPIC_TERM');
  }
  if (options.q) {
    const q = options.q.toLowerCase();
    items = items.filter((item) => item.primarySurface.text.toLowerCase().includes(q));
  }
  return { items, nextCursor: null };
}

export function devGetTerminologyNotebookEntry(
  termId: string,
  explanationLanguage: ExplanationLanguage,
): NotebookEntryDetail | null {
  const entry = notebook.get(termId);
  const cardValue = cardsFor(explanationLanguage).find((term) => term.termId === termId);
  if (!entry || !cardValue) return null;
  if (entry.due && !entry.pendingReview) {
    entry.pendingReview = {
      kind: 'MATCH_PAIRS',
      promptSurface: cardValue.primarySurface.text,
      options: [
        { key: 'a', label: cardValue.englishEquivalent },
        { key: 'b', label: 'even function' },
        { key: 'c', label: 'domain' },
        { key: 'd', label: 'range' },
      ],
    };
  }
  return { entry, card: cardValue };
}

export function devSubmitTermReview(
  termId: string,
  selectedOptionKey: string,
): TermReviewResult | null {
  const entry = notebook.get(termId);
  if (!entry) return null;
  const correct = selectedOptionKey === 'a';
  const next: NotebookEntry = {
    ...entry,
    familiarity: correct ? 'FAMILIAR' : 'LEARNING',
    due: !correct,
    lastReviewAt: now(),
    pendingReview: correct
      ? null
      : {
          kind: 'MATCH_PAIRS',
          promptSurface: entry.primarySurface.text,
          options: [
            { key: 'a', label: 'common factor' },
            { key: 'b', label: 'even function' },
          ],
        },
  };
  notebook.set(termId, next);
  return {
    termId,
    kind: 'MATCH_PAIRS',
    correct,
    correctOptionKey: 'a',
    familiarity: next.familiarity,
    due: next.due,
    entry: next,
  };
}

export function __resetTerminologyDevFallback(): void {
  progressByPreview.clear();
  notebook.clear();
}
