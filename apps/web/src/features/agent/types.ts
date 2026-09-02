import type { components } from '@/shared/api/generated/openapi';

export type AcademicSubject = components['schemas']['AcademicAdmin.AcademicSubject'];
export type AgentAnswerKind = components['schemas']['AgentStudent.AgentAnswerKind'];
export type AgentAvailability = components['schemas']['AgentStudent.AgentAvailability'];
export type AgentCompletedTurn = components['schemas']['AgentStudent.AgentCompletedTurn'];
export type AgentContextType = components['schemas']['AgentStudent.AgentContextType'];
export type AgentConversation = components['schemas']['AgentStudent.AgentConversation'];
export type AgentConversationStart = components['schemas']['AgentStudent.AgentConversationStart'];
export type AgentFailedTurn = components['schemas']['AgentStudent.AgentFailedTurn'];
export type AgentLocator = components['schemas']['AgentStudent.AgentLocator'];
export type AgentPendingTurn = components['schemas']['AgentStudent.AgentPendingTurn'];
export type AgentTraceStep = components['schemas']['AgentStudent.AgentTraceStep'];
export type AgentTurn = components['schemas']['AgentStudent.AgentTurn'];
export type AgentTurnRequest = components['schemas']['AgentStudent.AgentTurnRequest'];
export type AgentUnavailableCode = components['schemas']['AgentStudent.AgentUnavailableCode'];

export const QUESTION_MIN_LENGTH = 1;
export const QUESTION_MAX_LENGTH = 2000;
export const QUOTE_MAX_LENGTH = 4000;
/** TEXT / terminology selections stay short; MATH snap may use the full latex cap. */
export const TEXT_QUOTE_MAX_LENGTH = 500;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export interface MathBlockSource {
  index: number;
  latex: string;
}

export type AgentHostContext =
  | {
      contextType: Exclude<AgentContextType, 'ITEM'>;
      contextId: string;
    }
  | {
      contextType: 'ITEM';
      contextId: string;
      sessionId: string;
      itemId: string;
    };

export function isCompletedTurn(turn: AgentTurn): turn is AgentCompletedTurn {
  return turn.status === 'COMPLETED';
}

export function isPendingTurn(turn: AgentTurn): turn is AgentPendingTurn {
  return turn.status === 'PENDING';
}

export function isFailedTurn(turn: AgentTurn): turn is AgentFailedTurn {
  return turn.status === 'FAILED';
}

/**
 * Server conversations are newest-last (oldest first). Display that order as-is.
 * Do not reverse: reversing would pin the latest turn at the top of the rail.
 */
export function turnsOldestFirst(turns: readonly AgentTurn[]): AgentTurn[] {
  return [...turns];
}

export function workedSeconds(latencyMs: number): number {
  return Math.max(1, Math.round(latencyMs / 1000));
}
