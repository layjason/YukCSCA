import { expect, test } from 'vitest';
import { resolveLocalizedText, resolveLocalizedTextForExplanation } from './localizedText';

const sample = {
  indonesian: 'Faktorisasi',
  english: 'Factorisation',
  simplifiedChinese: '因式分解',
};

test('resolveLocalizedText prefers interface language with fallback', () => {
  expect(resolveLocalizedText(sample, 'id')).toBe('Faktorisasi');
  expect(resolveLocalizedText(sample, 'en')).toBe('Factorisation');
  expect(resolveLocalizedText(sample, 'zh-CN')).toBe('因式分解');
  expect(resolveLocalizedText({ english: 'Only EN' }, 'id')).toBe('Only EN');
  expect(resolveLocalizedText({}, 'en')).toBe('');
});

test('resolveLocalizedTextForExplanation prefers explanation language field', () => {
  expect(resolveLocalizedTextForExplanation(sample, 'zh-CN', 'en')).toBe('因式分解');
  expect(resolveLocalizedTextForExplanation({ english: 'Only EN' }, 'id', 'en')).toBe('Only EN');
});
