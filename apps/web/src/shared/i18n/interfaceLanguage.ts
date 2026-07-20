export const SUPPORTED_INTERFACE_LANGUAGES = ['id', 'en', 'zh-CN'] as const;

export type InterfaceLanguage = (typeof SUPPORTED_INTERFACE_LANGUAGES)[number];

export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguage = 'en';
export const INTERFACE_LANGUAGE_STORAGE_KEY = 'yukcsca.interfaceLanguage';

export function normalizeInterfaceLanguage(
  language: string | null | undefined,
): InterfaceLanguage | null {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();
  if (normalized === 'id' || normalized.startsWith('id-')) {
    return 'id';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (
    normalized === 'zh' ||
    normalized === 'zh-cn' ||
    normalized === 'zh-sg' ||
    normalized.startsWith('zh-hans')
  ) {
    return 'zh-CN';
  }

  return null;
}

export function resolveInitialInterfaceLanguage(
  storedLanguage: string | null,
  browserLanguages: readonly string[],
): InterfaceLanguage {
  const storedPreference = normalizeInterfaceLanguage(storedLanguage);
  if (storedPreference) {
    return storedPreference;
  }

  for (const browserLanguage of browserLanguages) {
    const supportedLanguage = normalizeInterfaceLanguage(browserLanguage);
    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return DEFAULT_INTERFACE_LANGUAGE;
}
