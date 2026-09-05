import type {
  AgentAvailability,
  AgentCompletedTurn,
  AgentConversation,
  AgentConversationStart,
  AgentTurnRequest,
} from '../types';

const CONV_ID = '00000000-0000-4000-8000-0000000000a1';
const TURN_ID = '00000000-0000-4000-8000-0000000000a2';
const PACKAGE_ID = '00000000-0000-4000-8000-0000000000b1';
const REVISION_ID = '00000000-0000-4000-8000-0000000000b2';

const conversations = new Map<string, AgentConversation>();

function contextKey(input: AgentConversationStart): string {
  return `${input.contextType}:${input.contextId}`;
}

function emptyConversation(input: AgentConversationStart): AgentConversation {
  const now = new Date().toISOString();
  return {
    id: CONV_ID,
    contextType: input.contextType,
    contextId: input.contextId,
    subject: 'MATHEMATICS',
    packageId: PACKAGE_ID,
    packageRevisionId: REVISION_ID,
    sessionId: input.sessionId ?? null,
    itemId: input.itemId ?? null,
    explanationLanguage: 'id',
    examLanguage: 'en',
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function devGetAvailability(): AgentAvailability {
  return { available: true, unavailableCode: null };
}

export function devStartConversation(input: AgentConversationStart): AgentConversation {
  const key = contextKey(input);
  const existing = conversations.get(key);
  if (existing) return existing;
  const created = emptyConversation(input);
  conversations.set(key, created);
  return created;
}

export function devGetConversation(conversationId: string): AgentConversation | null {
  for (const conversation of conversations.values()) {
    if (conversation.id === conversationId) return conversation;
  }
  return (
    conversations.values().next().value ??
    emptyConversation({
      contextType: 'LESSON',
      contextId: CONV_ID,
    })
  );
}

export function devAskTurn(request: AgentTurnRequest): AgentCompletedTurn {
  const now = new Date().toISOString();
  const turn: AgentCompletedTurn = {
    id: TURN_ID,
    status: 'COMPLETED',
    questionText: request.questionText,
    quote: request.quote ?? null,
    createdAt: now,
    kind: 'DERIVED_EXPLANATION',
    body: 'This is local preview assistance, not from reviewed text.',
    locators: [],
    steps: [
      {
        kind: 'MODEL',
        label: 'Prepared a local preview answer',
        locators: [],
        latencyMs: 40,
      },
    ],
    suggestedFollowUps: [],
    latencyMs: 400,
  };
  for (const [key, conversation] of conversations) {
    conversations.set(key, {
      ...conversation,
      turns: [...conversation.turns, turn].slice(-20),
      updatedAt: now,
    });
  }
  return turn;
}

/** @internal Test helper — not for production callers. */
export function __resetAgentDevFallback(): void {
  conversations.clear();
}
