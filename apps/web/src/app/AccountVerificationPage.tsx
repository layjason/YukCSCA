import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { AccountVerificationForm } from '@/features/auth/AccountVerificationForm';

export function AccountVerificationPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="center-card" aria-live="polite">
        {t('auth.restoringSession')}
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <AccountVerificationForm />;
}
