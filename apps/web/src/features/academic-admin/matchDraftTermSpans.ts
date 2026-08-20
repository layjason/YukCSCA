import { reservedInlineLatexRanges } from '@/shared/content/inlineLatex';
import type { TermClass, TermDraft } from './types';

const EXAM_WORDING: ReadonlySet<TermClass> = new Set(['EXAM_INSTRUCTION', 'LOGICAL_EXPRESSION']);

export type DraftStemSpan = {
  termId: string;
  surfaceForm: string;
  startOffset: number;
  endOffset: number;
};

function occupied(text: string): boolean[] {
  const used = Array.from({ length: text.length }, () => false);
  for (const range of reservedInlineLatexRanges(text)) {
    for (let i = range.start; i < range.end && i < used.length; i += 1) {
      used[i] = true;
    }
  }
  return used;
}

function rangeUsed(used: boolean[], start: number, end: number): boolean {
  for (let i = start; i < end; i += 1) {
    if (used[i]) return true;
  }
  return false;
}

export function autoMatchTermIds(
  terms: readonly TermDraft[],
  requiredTermIds: ReadonlySet<string>,
): Set<string> {
  const ids = new Set(requiredTermIds);
  for (const term of terms) {
    if (EXAM_WORDING.has(term.termClass)) ids.add(term.id);
  }
  return ids;
}

/** Longest-first exact surfaces in TEXT, skipping inline LaTeX. Authoring preview only. */
export function matchDraftTermSpans(
  text: string,
  terms: readonly TermDraft[],
  lightingIds: ReadonlySet<string>,
): DraftStemSpan[] {
  const used = occupied(text);
  const spans: DraftStemSpan[] = [];
  const seen = new Set<string>();
  const candidates: Array<{ termId: string; text: string }> = [];
  for (const term of terms) {
    if (!lightingIds.has(term.id)) continue;
    for (const surface of term.surfaceForms ?? []) {
      const needle = surface.text.trim();
      if (needle) candidates.push({ termId: term.id, text: needle });
    }
  }
  candidates.sort((a, b) => b.text.length - a.text.length);
  for (const candidate of candidates) {
    const needle = candidate.text;
    let from = 0;
    while (from <= text.length - needle.length) {
      const start = text.indexOf(needle, from);
      if (start < 0) break;
      const end = start + needle.length;
      const key = `${candidate.termId}:${start}:${end}`;
      if (!rangeUsed(used, start, end) && !seen.has(key)) {
        for (let i = start; i < end; i += 1) used[i] = true;
        seen.add(key);
        spans.push({
          termId: candidate.termId,
          surfaceForm: needle,
          startOffset: start,
          endOffset: end,
        });
      }
      from = start + 1;
    }
  }
  return spans;
}

export function suggestedTermIdsInStem(
  texts: readonly string[],
  terms: readonly TermDraft[],
  requiredTermIds: ReadonlySet<string>,
): Set<string> {
  const auto = autoMatchTermIds(terms, requiredTermIds);
  const ids = new Set<string>();
  for (const text of texts) {
    for (const span of matchDraftTermSpans(text, terms, auto)) {
      ids.add(span.termId);
    }
  }
  return ids;
}

/**
 * Checkbox + preview set. Extra-only pins keep platform suggestions. Once the saved attachments
 * include a suggested preset, that checked set is exclusive so an uncheck sticks.
 */
export function adminCheckedTermIds(
  texts: readonly string[],
  terms: readonly TermDraft[],
  requiredTermIds: ReadonlySet<string>,
  attachments: readonly { termId: string }[] | undefined,
): Set<string> {
  const auto = autoMatchTermIds(terms, requiredTermIds);
  const attached = new Set((attachments ?? []).map((row) => row.termId));
  const exclusive = [...attached].some((id) => auto.has(id));
  if (exclusive) return attached;
  const checked = new Set(attached);
  for (const id of suggestedTermIdsInStem(texts, terms, requiredTermIds)) {
    checked.add(id);
  }
  return checked;
}
