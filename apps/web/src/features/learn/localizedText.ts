import type { ExplanationLanguage, LocalizedText } from './types';

/** Interface-language preference order for titles/summaries (chrome language, not explanation). */
const INTERFACE_TO_FIELD: Record<string, Array<keyof LocalizedText>> = {
  id: ['indonesian', 'english', 'simplifiedChinese'],
  en: ['english', 'indonesian', 'simplifiedChinese'],
  'zh-CN': ['simplifiedChinese', 'english', 'indonesian'],
};

/**
 * Resolve LocalizedText for UI chrome using interface language with fallback chain.
 * Explanation-language lesson bodies use separate versions on the API — do not use this for
 * lesson block content.
 */
export function resolveLocalizedText(
  text: LocalizedText | null | undefined,
  interfaceLanguage: string,
): string {
  if (!text) return '';
  const order: Array<keyof LocalizedText> = INTERFACE_TO_FIELD[interfaceLanguage] ??
    INTERFACE_TO_FIELD.en ?? ['english'];
  for (const key of order) {
    const value = text[key]?.trim();
    if (value) return value;
  }
  return '';
}

/** Prefer an explanation language when choosing a display string for lesson titles in reader chrome. */
export function resolveLocalizedTextForExplanation(
  text: LocalizedText | null | undefined,
  explanationLanguage: ExplanationLanguage,
  interfaceLanguage: string,
): string {
  if (!text) return '';
  const preferred: keyof LocalizedText =
    explanationLanguage === 'id'
      ? 'indonesian'
      : explanationLanguage === 'zh-CN'
        ? 'simplifiedChinese'
        : 'english';
  const preferredValue = text[preferred]?.trim();
  if (preferredValue) return preferredValue;
  return resolveLocalizedText(text, interfaceLanguage);
}
