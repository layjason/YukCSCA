import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';
import zhCN from './locales/zh-CN.json';
import {
  DEFAULT_INTERFACE_LANGUAGE,
  INTERFACE_LANGUAGE_STORAGE_KEY,
  normalizeInterfaceLanguage,
  resolveInitialInterfaceLanguage,
} from './interfaceLanguage';

function readStoredInterfaceLanguage(): string | null {
  try {
    return window.localStorage.getItem(INTERFACE_LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readBrowserLanguages(): readonly string[] {
  if (navigator.languages.length > 0) {
    return navigator.languages;
  }
  return navigator.language ? [navigator.language] : [];
}

function persistInterfaceLanguage(language: string): void {
  const supportedLanguage = normalizeInterfaceLanguage(language);
  if (!supportedLanguage) {
    return;
  }

  document.documentElement.lang = supportedLanguage;
  try {
    window.localStorage.setItem(INTERFACE_LANGUAGE_STORAGE_KEY, supportedLanguage);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

const initialLanguage = resolveInitialInterfaceLanguage(
  readStoredInterfaceLanguage(),
  readBrowserLanguages(),
);

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      id: { translation: id },
      en: { translation: en },
      'zh-CN': { translation: zhCN },
    },
    supportedLngs: ['id', 'en', 'zh-CN'],
    lng: initialLanguage,
    fallbackLng: DEFAULT_INTERFACE_LANGUAGE,
    interpolation: { escapeValue: false },
  })
  .then(() => {
    document.documentElement.lang =
      normalizeInterfaceLanguage(i18n.resolvedLanguage) ?? initialLanguage;
    i18n.on('languageChanged', persistInterfaceLanguage);
  });

export default i18n;
