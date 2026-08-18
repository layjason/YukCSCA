import type { TermCard, TermClass, TermDefinition, TermMetIn } from './types';
import { classGroupFor } from './types';

export function termDefinitionText(definition: TermDefinition, unavailableLabel: string): string {
  return definition.availability === 'AVAILABLE' ? definition.text : unavailableLabel;
}

export function termAccessibleName(card: TermCard, unavailableLabel: string): string {
  const definition = termDefinitionText(card.definition, unavailableLabel);
  return `${card.primarySurface.text}. ${definition}`;
}

export function termClassLabelKey(termClass: TermClass): string {
  return `terminology.class.${termClass}`;
}

export function termClassGroupLabelKey(termClass: TermClass): string {
  return `terminology.classGroup.${classGroupFor(termClass)}`;
}

export function placeLabelKey(place: TermMetIn['place']): string {
  return `terminology.place.${place}`;
}

/** Split a TEXT block by UTF-16 offsets. Overlapping later spans are skipped. */
export function splitTextBySpans<T extends { startOffset: number; endOffset: number }>(
  text: string,
  spans: readonly T[],
): Array<{ text: string; span: T | null }> {
  const ordered = [...spans]
    .filter((span) => span.startOffset >= 0 && span.endOffset > span.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);

  const parts: Array<{ text: string; span: T | null }> = [];
  let cursor = 0;
  for (const span of ordered) {
    const start = Math.min(span.startOffset, text.length);
    const end = Math.min(span.endOffset, text.length);
    if (start < cursor || start >= end) continue;
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), span: null });
    }
    parts.push({ text: text.slice(start, end), span });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), span: null });
  }
  return parts;
}

const MAX_LOOKUP_CHARS = 24;

export function selectedLookupText(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 1 || trimmed.length > MAX_LOOKUP_CHARS) return null;
  if (/[.。！？!?]/.test(trimmed) && trimmed.length > 8) return null;
  return trimmed;
}
