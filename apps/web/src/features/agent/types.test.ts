import { expect, test } from 'vitest';
import type { AgentCompletedTurn } from './types';
import { turnsOldestFirst } from './types';

function turn(id: string, questionText: string): AgentCompletedTurn {
  return {
    id,
    status: 'COMPLETED',
    questionText,
    quote: null,
    createdAt: '2026-09-02T00:00:00Z',
    kind: 'REVIEWED_SOURCE',
    body: 'Body',
    locators: [],
    steps: [],
    suggestedFollowUps: [],
    latencyMs: 1000,
  };
}

test('turnsOldestFirst keeps newest-last server order', () => {
  const oldest = turn('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'First');
  const newest = turn('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Second');
  expect(turnsOldestFirst([oldest, newest]).map((row) => row.questionText)).toEqual([
    'First',
    'Second',
  ]);
});
