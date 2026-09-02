import { expect, test } from 'vitest';
import en from '@/shared/i18n/locales/en.json';
import id from '@/shared/i18n/locales/id.json';
import zh from '@/shared/i18n/locales/zh-CN.json';

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key),
  );
}

test('keeps agent keys aligned across en/id/zh-CN', () => {
  const enKeys = new Set(flatten(en.agent));
  expect(new Set(flatten(id.agent))).toEqual(enKeys);
  expect(new Set(flatten(zh.agent))).toEqual(enKeys);
});

test('agent chrome never claims official status or a report CTA', () => {
  const texts = flatten(en.agent)
    .map((path) => {
      const parts = path.split('.');
      let cur: unknown = en.agent;
      for (const part of parts) {
        if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[part];
      }
      return typeof cur === 'string' ? cur : '';
    })
    .filter(Boolean);
  for (const text of texts) {
    expect(text.toLowerCase()).not.toMatch(/official|report this|report answer/);
  }
});
