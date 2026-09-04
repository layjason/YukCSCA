import { expect, test } from 'vitest';
import type { AgentCompletedTurn, AgentLocator } from './types';
import { dedupeLocators, turnsOldestFirst } from './types';

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

test('dedupeLocators keeps the first sourceKind+sourceId+blockIndex', () => {
  const first: AgentLocator = {
    sourceKind: 'LESSON',
    sourceId: '33333333-3333-4333-8333-333333333333',
    label: 'Quadratic',
    blockIndex: 1,
    packageRevisionId: null,
  };
  const duplicate: AgentLocator = { ...first, label: 'Same block again' };
  const other: AgentLocator = { ...first, blockIndex: 2, label: 'Next block' };
  expect(dedupeLocators([first, duplicate, other]).map((row) => row.label)).toEqual([
    'Quadratic',
    'Next block',
  ]);
});
