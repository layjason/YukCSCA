import { describe, expect, test } from 'vitest';
import { generatedPinyin, nextPinyin } from './chinesePinyin';

describe('generatedPinyin', () => {
  test('returns tone-marked syllables for Chinese', () => {
    expect(generatedPinyin('导数')).toBe('dǎo shù');
  });

  test('returns empty when there is no Chinese', () => {
    expect(generatedPinyin('')).toBe('');
    expect(generatedPinyin('abc')).toBe('');
  });
});

describe('nextPinyin', () => {
  test('fills when the pinyin field is empty', () => {
    expect(nextPinyin('', '', '求')).toBe('qiú');
  });

  test('replaces a previous auto-fill when the Chinese changes', () => {
    expect(nextPinyin('求', 'qiú', '证明')).toBe('zhèng míng');
  });

  test('keeps an admin polyphone correction', () => {
    expect(nextPinyin('银行', 'yín xíng', '银行卡')).toBe('yín xíng');
  });
});
