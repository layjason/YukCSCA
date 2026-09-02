import { afterEach, expect, test } from 'vitest';
import {
  clearStoredConversationId,
  conversationStorageKey,
  readStoredConversationId,
  writeStoredConversationId,
} from './conversationStorage';

const CONTEXT_ID = '33333333-3333-4333-8333-333333333333';
const CONV_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

afterEach(() => {
  sessionStorage.clear();
});

test('stores and reads a conversation id for a context', () => {
  writeStoredConversationId('LESSON', CONTEXT_ID, CONV_ID);
  expect(readStoredConversationId('LESSON', CONTEXT_ID)).toBe(CONV_ID);
  expect(sessionStorage.getItem(conversationStorageKey('LESSON', CONTEXT_ID))).toBe(CONV_ID);
});

test('ignores non-uuid stored values', () => {
  sessionStorage.setItem(conversationStorageKey('LESSON', CONTEXT_ID), 'not-a-uuid');
  expect(readStoredConversationId('LESSON', CONTEXT_ID)).toBeNull();
});

test('clears stored conversation ids', () => {
  writeStoredConversationId('ITEM', CONTEXT_ID, CONV_ID);
  clearStoredConversationId('ITEM', CONTEXT_ID);
  expect(readStoredConversationId('ITEM', CONTEXT_ID)).toBeNull();
});
