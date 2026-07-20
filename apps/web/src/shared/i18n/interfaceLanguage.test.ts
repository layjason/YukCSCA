import { describe, expect, test } from 'vitest';
import {
  DEFAULT_INTERFACE_LANGUAGE,
  normalizeInterfaceLanguage,
  resolveInitialInterfaceLanguage,
} from './interfaceLanguage';

describe('interface language resolution', () => {
  test('prefers a valid stored interface-language choice', () => {
    expect(resolveInitialInterfaceLanguage('zh-CN', ['id-ID'])).toBe('zh-CN');
  });

  test('uses the first supported browser locale when no valid choice is stored', () => {
    expect(resolveInitialInterfaceLanguage('fr-FR', ['fr-FR', 'en-GB', 'id-ID'])).toBe('en');
  });

  test('falls back without assuming Bahasa Indonesia', () => {
    expect(resolveInitialInterfaceLanguage(null, ['fr-FR'])).toBe(DEFAULT_INTERFACE_LANGUAGE);
    expect(DEFAULT_INTERFACE_LANGUAGE).toBe('en');
  });

  test('does not map Traditional Chinese to the Simplified Chinese resource', () => {
    expect(normalizeInterfaceLanguage('zh-TW')).toBeNull();
    expect(normalizeInterfaceLanguage('zh-Hans-SG')).toBe('zh-CN');
  });
});
