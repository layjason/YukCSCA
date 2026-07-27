import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { ConsumerState, ConsumerAction } from './consumerState';

export interface ConsumerContextValue {
  state: ConsumerState;
  dispatch: Dispatch<ConsumerAction>;
}

export const ConsumerContext = createContext<ConsumerContextValue | null>(null);

export function useConsumer(): ConsumerContextValue {
  const ctx = useContext(ConsumerContext);
  if (!ctx) {
    throw new Error('useConsumer must be used within ConsumerProvider');
  }
  return ctx;
}
