import { describe, expect, test } from 'vitest';
import en from './locales/en.json';
import id from './locales/id.json';
import zhCN from './locales/zh-CN.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n locale key parity', () => {
  const enKeys = flattenKeys(en);
  const idKeys = flattenKeys(id);
  const zhKeys = flattenKeys(zhCN);

  test('English and Indonesian have identical key sets', () => {
    const missingInId = enKeys.filter((k) => !idKeys.includes(k));
    const extraInId = idKeys.filter((k) => !enKeys.includes(k));
    expect(missingInId).toEqual([]);
    expect(extraInId).toEqual([]);
  });

  test('English and Simplified Chinese have identical key sets', () => {
    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
    const extraInZh = zhKeys.filter((k) => !enKeys.includes(k));
    expect(missingInZh).toEqual([]);
    expect(extraInZh).toEqual([]);
  });

  test('all three locales have the same number of keys', () => {
    expect(enKeys.length).toBe(idKeys.length);
    expect(enKeys.length).toBe(zhKeys.length);
  });
});
