import { expect, test } from 'vitest';
import {
  ASK_PROVIDER_FORMAT_DETAIL,
  ASK_PROVIDER_TIMEOUT_DETAIL,
  providerUnavailableCopyKey,
} from './providerUnavailable';

test('maps timeout and unreadable-answer details separately from a generic outage', () => {
  expect(providerUnavailableCopyKey(ASK_PROVIDER_TIMEOUT_DETAIL)).toBe('agent.errorTimeout');
  expect(providerUnavailableCopyKey(ASK_PROVIDER_FORMAT_DETAIL)).toBe('agent.errorAnswerFormat');
  expect(providerUnavailableCopyKey('The Ask provider is temporarily unavailable.')).toBe(
    'agent.errorProvider',
  );
  expect(providerUnavailableCopyKey('Provider down')).toBe('agent.errorProvider');
  expect(providerUnavailableCopyKey(undefined)).toBe('agent.errorProvider');
});
