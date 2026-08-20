import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import { useTermAudio } from './useTermAudio';

beforeEach(() => {
  vi.spyOn(terminologyApi, 'getTermPronunciation').mockResolvedValue(
    new Blob(['ID3'], { type: 'audio/mpeg' }),
  );
  vi.stubGlobal(
    'Audio',
    class {
      onended: (() => void) | null = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    },
  );
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('play always fetches the term id passed on that click', async () => {
  const { result } = renderHook(() => useTermAudio());

  await act(async () => {
    await result.current.play('term-a', '导函数');
  });
  await act(async () => {
    await result.current.play('term-b', '定义域');
  });

  expect(terminologyApi.getTermPronunciation).toHaveBeenNthCalledWith(1, 'term-a', '导函数');
  expect(terminologyApi.getTermPronunciation).toHaveBeenNthCalledWith(2, 'term-b', '定义域');
});
