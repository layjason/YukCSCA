import type { TermDraft } from './types';

/**
 * Admin-facing term identity for pickers. Persist `term.id`; never show the UUID
 * when a Chinese surface, alias, or English equivalent exists.
 */
export function termDraftLabel(term: TermDraft, untitled: string): string {
  const surfaces = (term.surfaceForms ?? []).map((surface) => surface.text.trim()).filter(Boolean);
  if (surfaces[0]) {
    const aliases = surfaces.slice(1);
    return aliases.length > 0 ? `${surfaces[0]} (${aliases.join(' · ')})` : surfaces[0];
  }
  const english = term.englishEquivalent?.trim();
  if (english) return english;
  return untitled;
}
