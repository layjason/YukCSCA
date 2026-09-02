import { isUuid, type AgentContextType } from './types';

const PREFIX = 'yukcsca.agent.conversation:';

export function conversationStorageKey(contextType: AgentContextType, contextId: string): string {
  return `${PREFIX}${contextType}:${contextId}`;
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStoredConversationId(
  contextType: AgentContextType,
  contextId: string,
): string | null {
  const raw = storage()?.getItem(conversationStorageKey(contextType, contextId));
  if (!raw || !isUuid(raw)) return null;
  return raw;
}

export function writeStoredConversationId(
  contextType: AgentContextType,
  contextId: string,
  conversationId: string,
): void {
  if (!isUuid(conversationId)) return;
  storage()?.setItem(conversationStorageKey(contextType, contextId), conversationId);
}

export function clearStoredConversationId(contextType: AgentContextType, contextId: string): void {
  storage()?.removeItem(conversationStorageKey(contextType, contextId));
}
