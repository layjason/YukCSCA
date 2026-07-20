import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children }: PropsWithChildren): React.JSX.Element {
  const { t } = useTranslation();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <main className="center-card" aria-live="polite">
        {t('auth.restoringSession')}
      </main>
    );
  }
  return status === 'authenticated' ? <>{children}</> : <Navigate to="/login" replace />;
}
