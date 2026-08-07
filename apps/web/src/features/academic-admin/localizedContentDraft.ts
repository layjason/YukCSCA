import type { ContentBlock, ExplanationLanguage } from './types';

/** Contract explanation / content languages (backend EXPLANATION_LANGUAGES). */
export const EXPLANATION_LANGUAGES = [
  'id',
  'en',
  'zh-CN',
] as const satisfies readonly ExplanationLanguage[];

export type LocalizedContentVersion = {
  language: ExplanationLanguage;
  blocks: ContentBlock[];
};

export function emptyBlocks(): ContentBlock[] {
  return [{ kind: 'TEXT', text: '' }];
}

export function createVersion(
  language: ExplanationLanguage,
  blocks: ContentBlock[] = emptyBlocks(),
): LocalizedContentVersion {
  return { language, blocks };
}

/** True when a content block would pass backend non-empty checks for that kind. */
export function isBlockFilled(block: ContentBlock): boolean {
  switch (block.kind) {
    case 'TEXT':
      return Boolean(block.text?.trim());
    case 'MATH':
      return Boolean(block.latex?.trim());
    case 'IMAGE':
      return Boolean(block.imageId && block.altText?.trim());
    default:
      return false;
  }
}

/** True when a language version has at least one filled block (safe to send on publish). */
export function isVersionFilled(version: LocalizedContentVersion | undefined): boolean {
  if (!version?.blocks?.length) return false;
  return version.blocks.some(isBlockFilled);
}

/** Upsert a language version; preserves order of existing languages when updating. */
export function upsertLocalizedVersion(
  versions: readonly LocalizedContentVersion[],
  language: ExplanationLanguage,
  blocks: ContentBlock[],
): LocalizedContentVersion[] {
  const index = versions.findIndex((v) => v.language === language);
  if (index < 0) {
    return [...versions, { language, blocks }];
  }
  return versions.map((v, i) => (i === index ? { language, blocks } : v));
}

export function removeLocalizedVersion(
  versions: readonly LocalizedContentVersion[],
  language: ExplanationLanguage,
): LocalizedContentVersion[] {
  return versions.filter((v) => v.language !== language);
}

/**
 * Drop versions with no real content so empty optional languages are not sent to the API.
 * Empty result means “no language filled yet” (draft OK; publish will require ≥1).
 */
export function pruneEmptyLocalizedVersions(
  versions: readonly LocalizedContentVersion[],
): LocalizedContentVersion[] {
  return EXPLANATION_LANGUAGES.flatMap((language) => {
    const version = versions.find((v) => v.language === language);
    if (!version || !isVersionFilled(version)) return [];
    return [{ language, blocks: version.blocks }];
  });
}

/** Stable editor order: id, en, zh-CN with empty shell when missing. */
export function versionForLanguage(
  versions: readonly LocalizedContentVersion[],
  language: ExplanationLanguage,
): LocalizedContentVersion {
  return versions.find((v) => v.language === language) ?? createVersion(language);
}

export function ensureAtLeastOneVersion(
  versions: readonly LocalizedContentVersion[],
  fallbackLanguage: ExplanationLanguage = 'en',
): LocalizedContentVersion[] {
  if (versions.length > 0) return [...versions];
  return [createVersion(fallbackLanguage)];
}
