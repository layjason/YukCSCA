import { createContext } from 'react';
import type { AuthStatus, CurrentUser } from './auth.types';

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  login(credential: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
