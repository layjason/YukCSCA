import { act, renderHook } from '@testing-library/react';
import { DESKTOP_NAV_EXPANDED_KEY, useDesktopNavExpanded } from './useDesktopNavExpanded';

beforeEach(() => {
  window.localStorage.removeItem(DESKTOP_NAV_EXPANDED_KEY);
});

test('defaults to expanded and persists collapse', () => {
  const { result } = renderHook(() => useDesktopNavExpanded());
  expect(result.current.expanded).toBe(true);

  act(() => {
    result.current.toggle();
  });

  expect(result.current.expanded).toBe(false);
  expect(window.localStorage.getItem(DESKTOP_NAV_EXPANDED_KEY)).toBe('0');
});

test('restores a collapsed preference', () => {
  window.localStorage.setItem(DESKTOP_NAV_EXPANDED_KEY, '0');
  const { result } = renderHook(() => useDesktopNavExpanded());
  expect(result.current.expanded).toBe(false);
});
