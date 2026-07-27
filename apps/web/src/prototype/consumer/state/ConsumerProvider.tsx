import { useReducer } from 'react';
import type { ReactNode } from 'react';
import { ConsumerContext } from './consumerContext';
import { consumerReducer, initialConsumerState } from './consumerState';
import type { ConsumerState } from './consumerState';

interface ConsumerProviderProps {
  children: ReactNode;
  initialState?: Partial<ConsumerState>;
}

export function ConsumerProvider({
  children,
  initialState,
}: ConsumerProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(consumerReducer, {
    ...initialConsumerState,
    ...initialState,
  });

  return (
    <ConsumerContext.Provider value={{ state, dispatch }}>{children}</ConsumerContext.Provider>
  );
}
