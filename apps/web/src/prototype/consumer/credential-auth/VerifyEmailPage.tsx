import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';

const RESEND_COOLDOWN_SECONDS = 30;

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return email;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export function VerifyEmailPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();
  const [searchParams] = useSearchParams();

  const { credentialSession } = state;
  const isExpiredFixture = searchParams.get('fixture') === 'expired';

  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if no credential session in progress
  useEffect(() => {
    if (credentialSession.status === 'absent') {
      navigate('/register', { replace: true });
    }
  }, [credentialSession.status, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldown]);

  function handleVerify(): void {
    dispatch({ type: 'CREDENTIAL_VERIFIED', email: credentialSession.displayEmail });
    navigate('/onboarding/role');
  }

  function handleResend(): void {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setResent(true);
  }

  // Guard: if absent, the effect will redirect; render minimal fallback
  if (credentialSession.status === 'absent') {
    return (
      <div className="credential-page">
        <span className="credential-preview-badge" aria-label={t('preview.badgeAria')}>
          {t('preview.badge')}
        </span>
        <h1>{t('credential.verify.title')}</h1>
        <p>{t('credential.verify.noSession')}</p>
        <Link to="/register" className="btn-secondary">
          {t('credential.verify.backToRegister')}
        </Link>
      </div>
    );
  }

  return (
    <div className="credential-page">
      <span className="credential-preview-badge" aria-label={t('preview.badgeAria')}>
        {t('preview.badge')}
      </span>
      <h1>{t('credential.verify.title')}</h1>

      {isExpiredFixture ? (
        <div className="credential-verify-expired">
          <div className="credential-alert credential-alert-error" role="alert">
            {t('credential.verify.invalidToken')}
          </div>
          <p>{t('credential.verify.expiredHint')}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0
              ? t('credential.verify.resendCooldown', { seconds: cooldown })
              : t('credential.verify.resend')}
          </button>
          <p className="credential-alt-action">
            <Link to="/register">{t('credential.verify.backToRegister')}</Link>
          </p>
        </div>
      ) : (
        <div className="credential-verify-active">
          <p className="credential-page-subtitle">
            {t('credential.verify.description', {
              email: maskEmail(credentialSession.displayEmail),
            })}
          </p>

          {resent && (
            <div className="credential-alert credential-alert-info" role="status">
              {t('credential.verify.resent')}
            </div>
          )}

          <button type="button" className="credential-submit btn-primary" onClick={handleVerify}>
            {t('credential.verify.verifyButton')}
          </button>

          <div className="credential-verify-resend">
            <button
              type="button"
              className="credential-resend-btn"
              onClick={handleResend}
              disabled={cooldown > 0}
              aria-describedby="resend-cooldown-note"
            >
              {cooldown > 0
                ? t('credential.verify.resendCooldown', { seconds: cooldown })
                : t('credential.verify.resend')}
            </button>
            {cooldown > 0 && (
              <p id="resend-cooldown-note" className="credential-cooldown-note" aria-live="polite">
                {t('credential.verify.cooldownNote', { seconds: cooldown })}
              </p>
            )}
          </div>

          <p className="credential-preview-note">{t('credential.verify.previewNote')}</p>
        </div>
      )}
    </div>
  );
}
