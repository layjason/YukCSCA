import { createContext, useContext } from 'react';
import type { PrototypeAction, PrototypeState } from './prototypeState';

export interface PrototypeContextValue {
  state: PrototypeState;
  dispatch: React.Dispatch<PrototypeAction>;
}

export const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function usePrototype(): PrototypeContextValue {
  const ctx = useContext(PrototypeContext);
  if (!ctx) {
    throw new Error('usePrototype must be used inside PrototypeProvider');
  }
  return ctx;
}
