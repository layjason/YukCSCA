import { createContext } from 'react';
import type { AuthStatus, CredentialLoginRequest, CurrentUser } from './auth.types';

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  login(credential: string): Promise<void>;
  loginCredentials(request: CredentialLoginRequest): Promise<CurrentUser>;
  logout(): Promise<void>;
  replaceCurrentUser(user: CurrentUser): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
