import { afterEach, expect, test, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/httpClient';
import {
  __setAgentEnvForTests,
  askTurn,
  getAvailability,
  parseAvailability,
  shouldUseAgentDevFallback,
  startConversation,
} from './agentApi';
import { __resetAgentDevFallback } from './agentDevFallback';

const CONTEXT_ID = '33333333-3333-4333-8333-333333333333';
const CONV_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

afterEach(() => {
  clearAccessToken();
  __setAgentEnvForTests(null);
  __resetAgentDevFallback();
  vi.unstubAllGlobals();
});

test('parseAvailability accepts a working signal and typed unavailability', () => {
  expect(parseAvailability({ available: true, unavailableCode: null })).toEqual({
    available: true,
    unavailableCode: null,
  });
  expect(parseAvailability({ available: false, unavailableCode: 'AGENT_DISABLED' })).toEqual({
    available: false,
    unavailableCode: 'AGENT_DISABLED',
  });
});

test('parseAvailability rejects a malformed available true with a code', () => {
  expect(() => parseAvailability({ available: true, unavailableCode: 'AGENT_DISABLED' })).toThrow(
    ApiError,
  );
});

test('shouldUseAgentDevFallback never treats 403/404/409/429/5xx as mock-success', () => {
  const env = { DEV: true, MODE: 'development' };
  expect(shouldUseAgentDevFallback(new ApiError(403, { code: 'AGENT_DISABLED' }), 403, env)).toBe(
    false,
  );
  expect(shouldUseAgentDevFallback(new ApiError(404, {}), 404, env)).toBe(false);
  expect(shouldUseAgentDevFallback(new ApiError(409, { code: 'CONTEXT_CONFLICT' }), 409, env)).toBe(
    false,
  );
  expect(
    shouldUseAgentDevFallback(new ApiError(429, { code: 'AGENT_BUDGET_EXCEEDED' }), 429, env),
  ).toBe(false);
  expect(
    shouldUseAgentDevFallback(new ApiError(503, { code: 'AGENT_PROVIDER_UNAVAILABLE' }), 503, env),
  ).toBe(false);
  expect(shouldUseAgentDevFallback(new ApiError(401, {}), 401, env)).toBe(true);
});

test('getAvailability sends context query and returns the parsed body', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ available: true, unavailableCode: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(getAvailability({ contextType: 'LESSON', contextId: CONTEXT_ID })).resolves.toEqual({
    available: true,
    unavailableCode: null,
  });
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/v1/agent/availability?contextType=LESSON&contextId=${CONTEXT_ID}`,
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer student-token' }),
    }),
  );
});

test('getAvailability does not fallback a 403 into available true', async () => {
  setAccessToken('student-token');
  __setAgentEnvForTests({ DEV: true, MODE: 'development' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );

  await expect(
    getAvailability({ contextType: 'LESSON', contextId: CONTEXT_ID }),
  ).rejects.toBeInstanceOf(ApiError);
});

test('askTurn sends Idempotency-Key and omits empty quote', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        status: 'COMPLETED',
        questionText: 'What is a factor?',
        quote: null,
        createdAt: '2026-09-02T00:00:00Z',
        kind: 'REVIEWED_SOURCE',
        body: 'A factor multiplies to make a product.',
        locators: [],
        steps: [],
        suggestedFollowUps: [],
        latencyMs: 900,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);

  await askTurn(
    CONV_ID,
    { questionText: 'What is a factor?' },
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  );
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/v1/agent/conversations/${CONV_ID}/turns`,
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    }),
  );
  const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { quote?: string };
  expect(body.quote).toBeUndefined();
});

test('startConversation posts ITEM session and item ids', async () => {
  setAccessToken('student-token');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: CONV_ID,
        contextType: 'ITEM',
        contextId: CONTEXT_ID,
        subject: 'MATHEMATICS',
        packageId: '11111111-1111-4111-8111-111111111111',
        packageRevisionId: '22222222-2222-4222-8222-222222222222',
        sessionId: '55555555-5555-4555-8555-555555555555',
        itemId: CONTEXT_ID,
        explanationLanguage: 'id',
        examLanguage: 'en',
        turns: [],
        createdAt: '2026-09-02T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);

  await startConversation({
    contextType: 'ITEM',
    contextId: CONTEXT_ID,
    sessionId: '55555555-5555-4555-8555-555555555555',
    itemId: CONTEXT_ID,
  });
  const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
    sessionId: string;
    itemId: string;
  };
  expect(body.sessionId).toBe('55555555-5555-4555-8555-555555555555');
  expect(body.itemId).toBe(CONTEXT_ID);
});
