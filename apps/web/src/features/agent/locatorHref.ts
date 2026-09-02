import type { AcademicSubject, AgentHostContext, AgentLocator } from './types';

export interface LocatorConversationRef {
  subject: AcademicSubject;
  sessionId: string | null;
  contextType: AgentHostContext['contextType'];
  contextId: string;
}

export function isSamePageLocator(
  locator: AgentLocator,
  context: Pick<AgentHostContext, 'contextType' | 'contextId'>,
): boolean {
  if (locator.sourceId !== context.contextId) return false;
  if (locator.sourceKind !== context.contextType) return false;
  return locator.sourceKind === 'LESSON' || locator.sourceKind === 'REMEDIATION';
}

export function locatorHref(
  locator: AgentLocator,
  conversation: LocatorConversationRef,
): string | null {
  const subject = conversation.subject;
  const blockQuery =
    locator.blockIndex != null && Number.isInteger(locator.blockIndex)
      ? `?block=${locator.blockIndex}`
      : '';

  switch (locator.sourceKind) {
    case 'LESSON':
      return `/app/learn/${subject}/lessons/${locator.sourceId}${blockQuery}`;
    case 'REMEDIATION':
      return `/app/learn/${subject}/remediation/${locator.sourceId}${blockQuery}`;
    case 'TERMINOLOGY':
      return `/app/learn/terms/${locator.sourceId}`;
    case 'MISTAKE':
      return `/app/practice/mistakes/${locator.sourceId}`;
    case 'ITEM':
      return conversation.sessionId ? `/app/practice/sessions/${conversation.sessionId}` : null;
    default:
      return null;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToLearnBlock(index: number): void {
  const el = document.getElementById(`learn-block-${index}`);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
}
