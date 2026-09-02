import { getAccessToken } from '@/features/auth/authStore';
import { ApiError, parseJsonResponse } from '@/shared/api/httpClient';
import type {
  AgentAvailability,
  AgentCompletedTurn,
  AgentConversation,
  AgentConversationStart,
  AgentHostContext,
  AgentTurn,
  AgentTurnRequest,
  AgentUnavailableCode,
} from '../types';
import {
  devAskTurn,
  devGetAvailability,
  devGetConversation,
  devStartConversation,
} from './agentDevFallback';

const BASE = '/api/v1/agent';

export type AgentEnv = { DEV: boolean; MODE: string };

let agentEnvOverride: AgentEnv | null = null;

/** @internal Test helper — not for production callers. */
export function __setAgentEnvForTests(env: AgentEnv | null): void {
  agentEnvOverride = env;
}

function readEnv(): AgentEnv {
  if (agentEnvOverride) return agentEnvOverride;
  return {
    DEV: Boolean(import.meta.env.DEV),
    MODE: String(import.meta.env.MODE ?? 'production'),
  };
}

function isDevFallback(): boolean {
  const env = readEnv();
  return env.DEV && env.MODE !== 'test';
}

/**
 * DEV-only offline / 401 fallback for agent APIs.
 * Never mock-success on 400 / 403 / 404 / 409 / 429 / 5xx, malformed JSON, or contract mismatch.
 * Agent 404 is unauthorised/unknown context. Agent 503 means the server was reached.
 */
export function shouldUseAgentDevFallback(
  err: unknown,
  status: number | undefined,
  env: AgentEnv = readEnv(),
): boolean {
  if (!env.DEV || env.MODE === 'test') return false;
  if (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 429 ||
    (status !== undefined && status >= 500)
  ) {
    return false;
  }
  if (err instanceof ApiError) {
    if (
      err.status === 400 ||
      err.status === 403 ||
      err.status === 404 ||
      err.status === 409 ||
      err.status === 429 ||
      err.status >= 500
    ) {
      return false;
    }
    return err.status === 401;
  }
  return true;
}

function authorizationHeaders(includeContentType = true): Record<string, string> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, { title: 'Authentication required' });
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function mismatch(title: string): ApiError {
  return new ApiError(500, { title, code: 'CONTRACT_MISMATCH' });
}

const UNAVAILABLE_CODES: readonly AgentUnavailableCode[] = [
  'AGENT_DISABLED',
  'FORMAL_ASSISTANCE_DISABLED',
];

export function parseAvailability(value: unknown): AgentAvailability {
  if (!value || typeof value !== 'object') {
    throw mismatch('Invalid agent availability response');
  }
  const record = value as { available?: unknown; unavailableCode?: unknown };
  if (typeof record.available !== 'boolean') {
    throw mismatch('Invalid agent availability response');
  }
  if (record.available) {
    if (record.unavailableCode !== null) {
      throw mismatch('Invalid agent availability response');
    }
    return { available: true, unavailableCode: null };
  }
  if (
    record.unavailableCode !== 'AGENT_DISABLED' &&
    record.unavailableCode !== 'FORMAL_ASSISTANCE_DISABLED'
  ) {
    throw mismatch('Invalid agent availability response');
  }
  return { available: false, unavailableCode: record.unavailableCode };
}

function assertConversation(value: unknown): asserts value is AgentConversation {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    !('contextType' in value) ||
    !('contextId' in value) ||
    !('turns' in value) ||
    !Array.isArray((value as AgentConversation).turns)
  ) {
    throw mismatch('Invalid agent conversation response');
  }
}

function assertCompletedTurn(value: unknown): asserts value is AgentCompletedTurn {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as AgentTurn).status !== 'COMPLETED' ||
    !('kind' in value) ||
    !('body' in value) ||
    !('locators' in value) ||
    !('steps' in value) ||
    !('suggestedFollowUps' in value)
  ) {
    throw mismatch('Invalid agent turn response');
  }
}

export function availabilityQuery(context: AgentHostContext): AgentConversationStart {
  if (context.contextType === 'ITEM') {
    return {
      contextType: 'ITEM',
      contextId: context.contextId,
      sessionId: context.sessionId,
      itemId: context.itemId,
    };
  }
  return {
    contextType: context.contextType,
    contextId: context.contextId,
  };
}

function availabilitySearch(input: AgentConversationStart): string {
  const params = new URLSearchParams();
  params.set('contextType', input.contextType);
  params.set('contextId', input.contextId);
  if (input.contextType === 'ITEM') {
    if (input.sessionId) params.set('sessionId', input.sessionId);
    if (input.itemId) params.set('itemId', input.itemId);
  }
  return params.toString();
}

export async function getAvailability(context: AgentHostContext): Promise<AgentAvailability> {
  const query = availabilityQuery(context);
  try {
    const response = await fetch(`${BASE}/availability?${availabilitySearch(query)}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      return devGetAvailability();
    }
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(response.status, body as { title?: string; code?: string });
    }
    return parseAvailability(body);
  } catch (err) {
    if (shouldUseAgentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devGetAvailability();
    }
    throw err;
  }
}

export async function startConversation(context: AgentHostContext): Promise<AgentConversation> {
  const body = availabilityQuery(context);
  try {
    const response = await fetch(`${BASE}/conversations`, {
      method: 'POST',
      headers: authorizationHeaders(),
      body: JSON.stringify(body),
    });
    if (isDevFallback() && response.status === 401) {
      return devStartConversation(body);
    }
    const payload = await parseJsonResponse<unknown>(response);
    assertConversation(payload);
    return payload;
  } catch (err) {
    if (shouldUseAgentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devStartConversation(body);
    }
    throw err;
  }
}

export async function getConversation(conversationId: string): Promise<AgentConversation> {
  try {
    const response = await fetch(`${BASE}/conversations/${conversationId}`, {
      headers: authorizationHeaders(false),
    });
    if (isDevFallback() && response.status === 401) {
      const fallback = devGetConversation(conversationId);
      if (!fallback) throw new ApiError(404, { title: 'Conversation not found' });
      return fallback;
    }
    const payload = await parseJsonResponse<unknown>(response);
    assertConversation(payload);
    return payload;
  } catch (err) {
    if (shouldUseAgentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      const fallback = devGetConversation(conversationId);
      if (!fallback) throw new ApiError(404, { title: 'Conversation not found' });
      return fallback;
    }
    throw err;
  }
}

export async function askTurn(
  conversationId: string,
  request: AgentTurnRequest,
  idempotencyKey: string,
): Promise<AgentCompletedTurn> {
  const body: AgentTurnRequest = { questionText: request.questionText };
  if (request.quote != null && request.quote.length > 0) {
    body.quote = request.quote;
  }
  try {
    const response = await fetch(`${BASE}/conversations/${conversationId}/turns`, {
      method: 'POST',
      headers: {
        ...authorizationHeaders(),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (isDevFallback() && response.status === 401) {
      return devAskTurn(body);
    }
    const payload = await parseJsonResponse<unknown>(response);
    assertCompletedTurn(payload);
    return payload;
  } catch (err) {
    if (shouldUseAgentDevFallback(err, err instanceof ApiError ? err.status : undefined)) {
      return devAskTurn(body);
    }
    throw err;
  }
}

export function isUnavailableCode(code: string | undefined): code is AgentUnavailableCode {
  return UNAVAILABLE_CODES.includes(code as AgentUnavailableCode);
}
