import type { ExplanationLanguage, LocalizedText } from './types';

const INTERFACE_TO_FIELD: Record<string, Array<keyof LocalizedText>> = {
  id: ['indonesian', 'english', 'simplifiedChinese'],
  en: ['english', 'indonesian', 'simplifiedChinese'],
  'zh-CN': ['simplifiedChinese', 'english', 'indonesian'],
};

/** Resolve LocalizedText for chrome using interface language with fallback chain. */
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
