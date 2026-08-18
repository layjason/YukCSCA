import type {
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
  domain: string,
  language: ExplanationLanguage,
): TermCard {
  return {
    termId,
    subject: 'MATHEMATICS',
    packageId: TERM_DEV_IDS.PACKAGE_ID,
    termClass,
    primarySurface: surface(text, pinyin, termId === TERM_DEV_IDS.TERM_FACTOR),
    aliases: [],
    definition: { availability: 'AVAILABLE', language, text: definition },
    englishEquivalent: english,
    domainMeaning: domain,
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
      'A polynomial factor shared by two or more expressions.',
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
      'A function whose values do not decrease as the input increases.',
      language,
    ),
    card(
      TERM_DEV_IDS.TERM_FIND,
      'EXAM_INSTRUCTION',
      '求',
      'qiú',
      language === 'id' ? 'Tentukan' : language === 'zh-CN' ? '求出' : 'Find',
      'find',
      'An exam instruction asking the student to determine a value.',
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
  if (subject !== 'MATHEMATICS' || resourceId !== TERM_DEV_IDS.PREVIEW_ID) return null;
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
  if (resourceId !== TERM_DEV_IDS.PREVIEW_ID) return null;
  if (status === 'IN_PROGRESS' || status === 'PREVIEW_COMPLETE') {
    for (const term of cardsFor('en')) {
      upsertNotebook(term, 'REQUIRED_COURSE');
    }
  }
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
  if (resourceId !== TERM_DEV_IDS.PREVIEW_ID) return null;
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
  const entry = upsertNotebook(matched, request.source === 'ITEM' ? 'CLICKED' : 'CLICKED');
  return { outcome: 'MATCHED', card: matched, alreadyInNotebook: already, entry };
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
