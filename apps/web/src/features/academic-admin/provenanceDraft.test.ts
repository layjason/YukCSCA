import { describe, expect, test } from 'vitest';
import {
  isPublishableProvenance,
  toDraftProvenanceInput,
  toEditableProvenance,
} from './provenanceDraft';

describe('provenanceDraft', () => {
  test('original provenance is publishable without licence fields', () => {
    const editable = toEditableProvenance({ origin: 'YUKCSCA_ORIGINAL' });
    expect(isPublishableProvenance(editable)).toBe(true);
    expect(toDraftProvenanceInput(editable)).toEqual({ origin: 'YUKCSCA_ORIGINAL' });
  });

  test('licensed provenance requires provider, source, and permission', () => {
    const incomplete = toEditableProvenance({ origin: 'LICENSED' });
    expect(isPublishableProvenance(incomplete)).toBe(false);

    const complete = {
      origin: 'LICENSED' as const,
      provider: 'Publisher',
      sourceLocator: 'https://example.test/licence',
      permissionReference: 'Contract-1',
    };
    expect(isPublishableProvenance(complete)).toBe(true);
    expect(toDraftProvenanceInput(complete)).toEqual({
      origin: 'LICENSED',
      provider: 'Publisher',
      sourceLocator: 'https://example.test/licence',
      permissionReference: 'Contract-1',
    });
  });
});
