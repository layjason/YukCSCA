import { expect, test } from 'vitest';
import { addToChatAnchorFromRect, firstRangeRect } from './addToChatAnchor';

const VIEWPORT = { width: 1280, height: 800 };

test('places the pill above a mid-page selection and clamps horizontally', () => {
  const anchor = addToChatAnchorFromRect(
    { top: 240, bottom: 280, left: 640, width: 80, height: 40 },
    VIEWPORT,
  );
  expect(anchor.fallback).toBe(false);
  expect(anchor.place).toBe('above');
  expect(anchor.top).toBe(240);
  expect(anchor.left).toBe(680);
});

test('places the pill below a selection near the top edge', () => {
  const anchor = addToChatAnchorFromRect(
    { top: 12, bottom: 40, left: 200, width: 40, height: 28 },
    VIEWPORT,
  );
  expect(anchor.fallback).toBe(false);
  expect(anchor.place).toBe('below');
  expect(anchor.top).toBe(40);
});

test('falls back when the range has no usable rect', () => {
  const anchor = addToChatAnchorFromRect(null, VIEWPORT);
  expect(anchor.fallback).toBe(true);
  expect(anchor.left).toBe(640);
  expect(anchor.top).toBeGreaterThan(0);
});

test('firstRangeRect tolerates jsdom ranges without getClientRects', () => {
  expect(firstRangeRect({} as Range)).toBeNull();
});
