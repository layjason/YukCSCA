import { expect, test } from 'vitest';
import { isSamePageLocator, locatorHref } from './locatorHref';
import type { AgentLocator } from './types';

const LESSON_ID = '33333333-3333-4333-8333-333333333333';
const TERM_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const conversation = {
  subject: 'MATHEMATICS' as const,
  sessionId: SESSION_ID,
  contextType: 'LESSON' as const,
  contextId: LESSON_ID,
};

function locator(overrides: Partial<AgentLocator>): AgentLocator {
  return {
    sourceKind: 'LESSON',
    sourceId: LESSON_ID,
    label: 'Block',
    blockIndex: 2,
    packageRevisionId: null,
    ...overrides,
  };
}

test('builds lesson and remediation locators with block query', () => {
  expect(locatorHref(locator({}), conversation)).toBe(
    `/app/learn/MATHEMATICS/lessons/${LESSON_ID}?block=2`,
  );
  expect(
    locatorHref(locator({ sourceKind: 'REMEDIATION', sourceId: LESSON_ID }), conversation),
  ).toBe(`/app/learn/MATHEMATICS/remediation/${LESSON_ID}?block=2`);
});

test('builds term and mistake locators without inventing a session', () => {
  expect(
    locatorHref(
      locator({ sourceKind: 'TERMINOLOGY', sourceId: TERM_ID, blockIndex: null }),
      conversation,
    ),
  ).toBe(`/app/learn/terms/${TERM_ID}`);
  expect(
    locatorHref(
      locator({ sourceKind: 'MISTAKE', sourceId: TERM_ID, blockIndex: null }),
      conversation,
    ),
  ).toBe(`/app/practice/mistakes/${TERM_ID}`);
});

test('ITEM locators require a conversation session id', () => {
  expect(
    locatorHref(locator({ sourceKind: 'ITEM', sourceId: TERM_ID, blockIndex: null }), conversation),
  ).toBe(`/app/practice/sessions/${SESSION_ID}`);
  expect(
    locatorHref(locator({ sourceKind: 'ITEM', sourceId: TERM_ID, blockIndex: null }), {
      ...conversation,
      sessionId: null,
    }),
  ).toBeNull();
});

test('same-page locators are lesson or remediation on the current object', () => {
  expect(isSamePageLocator(locator({}), conversation)).toBe(true);
  expect(isSamePageLocator(locator({ sourceId: TERM_ID }), conversation)).toBe(false);
  expect(
    isSamePageLocator(locator({ sourceKind: 'TERMINOLOGY', sourceId: LESSON_ID }), conversation),
  ).toBe(false);
});
