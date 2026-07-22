import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AuthContext, type AuthContextValue } from './authContextValue';
import { loginWithGoogle, logout as logoutApi, refreshSession } from './authApi';
import type { AuthStatus, CurrentUser } from './auth.types';

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    void refreshSession()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credential: string) => {
    const currentUser = await loginWithGoogle(credential);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const replaceCurrentUser = useCallback((currentUser: CurrentUser) => {
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, replaceCurrentUser }),
    [login, logout, replaceCurrentUser, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
