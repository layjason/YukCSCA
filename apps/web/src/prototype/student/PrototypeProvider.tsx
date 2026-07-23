import { useReducer } from 'react';
import { PrototypeContext } from './prototypeContext';
import { prototypeReducer, type PrototypeState } from './prototypeState';
import { createScenarioState, type ScenarioId } from './scenarios';

interface PrototypeProviderProps {
  children: React.ReactNode;
  initialScenario?: ScenarioId;
  initialOverrides?: Partial<PrototypeState>;
}

export function PrototypeProvider({
  children,
  initialScenario = 'new-student',
  initialOverrides,
}: PrototypeProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(prototypeReducer, undefined, () =>
    createScenarioState(initialScenario, initialOverrides),
  );

  return (
    <PrototypeContext.Provider value={{ state, dispatch }}>{children}</PrototypeContext.Provider>
  );
}

export type { ScenarioId } from './scenarios';
