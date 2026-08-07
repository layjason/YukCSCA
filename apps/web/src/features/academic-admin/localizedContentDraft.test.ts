import { describe, expect, test } from 'vitest';
import {
  isVersionFilled,
  pruneEmptyLocalizedVersions,
  upsertLocalizedVersion,
  versionForLanguage,
} from './localizedContentDraft';

describe('localizedContentDraft', () => {
  test('upsertLocalizedVersion adds and updates languages without duplicates', () => {
    let versions = upsertLocalizedVersion([], 'en', [{ kind: 'TEXT', text: 'hello' }]);
    versions = upsertLocalizedVersion(versions, 'id', [{ kind: 'TEXT', text: 'halo' }]);
    versions = upsertLocalizedVersion(versions, 'en', [{ kind: 'TEXT', text: 'updated' }]);
    expect(versions.map((v) => v.language)).toEqual(['en', 'id']);
    expect(versions[0]?.blocks[0]).toMatchObject({ kind: 'TEXT', text: 'updated' });
  });

  test('isVersionFilled requires non-empty content blocks', () => {
    expect(isVersionFilled({ language: 'en', blocks: [{ kind: 'TEXT', text: '  ' }] })).toBe(false);
    expect(isVersionFilled({ language: 'en', blocks: [{ kind: 'TEXT', text: 'ok' }] })).toBe(true);
    expect(
      isVersionFilled({
        language: 'en',
        blocks: [{ kind: 'MATH', latex: 'x^2', displayMode: true }],
      }),
    ).toBe(true);
    expect(
      isVersionFilled({
        language: 'en',
        blocks: [
          {
            kind: 'IMAGE',
            imageId: '00000000-0000-0000-0000-000000000099',
            altText: 'diagram',
            caption: null,
          },
        ],
      }),
    ).toBe(true);
  });

  test('pruneEmptyLocalizedVersions keeps only filled languages in stable order', () => {
    const versions = [
      { language: 'zh-CN' as const, blocks: [{ kind: 'TEXT' as const, text: '中文' }] },
      { language: 'en' as const, blocks: [{ kind: 'TEXT' as const, text: '' }] },
      { language: 'id' as const, blocks: [{ kind: 'TEXT' as const, text: 'halo' }] },
    ];
    expect(pruneEmptyLocalizedVersions(versions).map((v) => v.language)).toEqual(['id', 'zh-CN']);
    expect(pruneEmptyLocalizedVersions([])).toEqual([]);
  });

  test('versionForLanguage returns empty shell when missing', () => {
    const shell = versionForLanguage([], 'id');
    expect(shell.language).toBe('id');
    expect(shell.blocks).toEqual([{ kind: 'TEXT', text: '' }]);
    expect(isVersionFilled(shell)).toBe(false);
  });
});
