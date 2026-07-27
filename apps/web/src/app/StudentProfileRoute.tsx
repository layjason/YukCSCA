import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';

export function StudentProfileRoute(): React.JSX.Element {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { state, dispatch } = useConsumer();

  if (status === 'authenticated') {
    return <ProfilePage />;
  }

  return (
    <div className="page-content">
      <h1>{t('profile.title')}</h1>
      <section className="state-notice state-notice-info">
        <h2>{t('guard.previewStudentAccount.title')}</h2>
        <p>{t('guard.previewStudentAccount.description')}</p>
        <dl>
          <dt>{t('profile.email')}</dt>
          <dd>{state.credentialSession.displayEmail}</dd>
          <dt>{t('profile.role')}</dt>
          <dd>
            {t('roles.STUDENT')} — {t('preview.badge')}
          </dd>
        </dl>
      </section>
      <div className="preview-context-guard-actions">
        <Link to="/login" className="btn-primary">
          {t('auth.continueWithGoogle')}
        </Link>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch({ type: 'PREVIEW_RESTART' })}
        >
          {t('guard.previewStudentAccount.exit')}
        </button>
      </div>
    </div>
  );
}
