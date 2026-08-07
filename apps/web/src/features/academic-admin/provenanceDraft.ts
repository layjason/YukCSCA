import type { ContentOrigin, DraftProvenanceInput } from './types';

export type ContentOriginValue = NonNullable<DraftProvenanceInput['origin']> | ContentOrigin;

/** Origins allowed by backend publish validation. */
export const CONTENT_ORIGINS = [
  'YUKCSCA_ORIGINAL',
  'LICENSED',
  'OPEN_LICENSE',
] as const satisfies readonly ContentOriginValue[];

export type EditableProvenance = {
  origin: ContentOriginValue;
  provider: string;
  sourceLocator: string;
  permissionReference: string;
};

export function emptyEditableProvenance(
  origin: ContentOriginValue = 'YUKCSCA_ORIGINAL',
): EditableProvenance {
  return {
    origin,
    provider: '',
    sourceLocator: '',
    permissionReference: '',
  };
}

export function toEditableProvenance(
  provenance: DraftProvenanceInput | null | undefined,
): EditableProvenance {
  return {
    origin: (provenance?.origin as ContentOriginValue) || 'YUKCSCA_ORIGINAL',
    provider: provenance?.provider ?? '',
    sourceLocator: provenance?.sourceLocator ?? '',
    permissionReference: provenance?.permissionReference ?? '',
  };
}

/**
 * Normalize for draft save input. Licensed/open fields are included when set;
 * original may omit empty licensed fields.
 */
export function toDraftProvenanceInput(editable: EditableProvenance): DraftProvenanceInput {
  const origin = editable.origin || 'YUKCSCA_ORIGINAL';
  if (origin === 'YUKCSCA_ORIGINAL') {
    return { origin: 'YUKCSCA_ORIGINAL' };
  }
  return {
    origin,
    provider: editable.provider.trim() || null,
    sourceLocator: editable.sourceLocator.trim() || null,
    permissionReference: editable.permissionReference.trim() || null,
  };
}

/** True when publish would accept this provenance (matches backend MISSING_PERMISSION rules). */
export function isPublishableProvenance(editable: EditableProvenance): boolean {
  if (!CONTENT_ORIGINS.includes(editable.origin as (typeof CONTENT_ORIGINS)[number])) {
    return false;
  }
  if (editable.origin === 'YUKCSCA_ORIGINAL') return true;
  return (
    editable.provider.trim().length > 0 &&
    editable.sourceLocator.trim().length > 0 &&
    editable.permissionReference.trim().length > 0
  );
}
