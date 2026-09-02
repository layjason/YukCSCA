import { expect, test } from 'vitest';
import { READING_MIN_PX, shouldHideTermRail } from './hideTermRail';

test('keeps the term rail when Ask is closed', () => {
  expect(shouldHideTermRail(false, 1280, 72)).toBe(false);
});

test('hides the term rail when remaining reading width would fall below 560px', () => {
  expect(shouldHideTermRail(true, 1280, 72)).toBe(true);
  expect(READING_MIN_PX).toBe(560);
});

test('keeps the term rail on a wide desktop with Ask open', () => {
  expect(shouldHideTermRail(true, 1920, 72)).toBe(false);
});
