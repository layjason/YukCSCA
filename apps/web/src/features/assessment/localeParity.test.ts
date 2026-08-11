import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/locales/en.json';
import id from '@/shared/i18n/locales/id.json';
import zh from '@/shared/i18n/locales/zh-CN.json';
import { containsProhibitedMasteryClaim } from './assessmentPolicy';

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('assessment locale parity', () => {
  it('keeps assessment keys aligned across en/id/zh-CN', () => {
    const enKeys = new Set(flatten(en.assessment));
    const idKeys = new Set(flatten(id.assessment));
    const zhKeys = new Set(flatten(zh.assessment));
    expect(idKeys).toEqual(enKeys);
    expect(zhKeys).toEqual(enKeys);
  });

  it('avoids Mastered / Stable Mastery in assessment chrome strings', () => {
    const texts = flatten(en.assessment)
      .map((path) => {
        const parts = path.split('.');
        let cur: unknown = en.assessment;
        for (const p of parts) {
          if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[p];
        }
        return typeof cur === 'string' ? cur : '';
      })
      .filter(Boolean);
    for (const text of texts) {
      expect(containsProhibitedMasteryClaim(text)).toBe(false);
    }
  });

  it('uses soft reveal wording for STRONG hint confirm, not a bare Strong label', () => {
    expect(en.assessment.hints.confirmTitle.toLowerCase()).toMatch(/reveal|answer|stuck/);
    expect(en.assessment.hints.confirmTitle.toLowerCase()).not.toBe('strong');
    expect(en.assessment.hints.revealIfStuck.toLowerCase()).toMatch(/stuck|nudge|hint/);
  });
});
