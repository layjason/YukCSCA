import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GoogleSignInButtonProps {
  onCredential(credential: string): Promise<void>;
}

export default function GoogleSignInButton({
  onCredential,
}: GoogleSignInButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const initialize = (): void => {
      if (cancelled) return;
      attempts += 1;
      const googleIdentity = window.google?.accounts?.id;
      const target = buttonRef.current;

      if (!googleIdentity || !target) {
        if (attempts < 50) timer = window.setTimeout(initialize, 100);
        else setError(t('auth.googleLoadError'));
        return;
      }
      if (!clientId) {
        setError(t('auth.googleClientMissing'));
        return;
      }

      target.replaceChildren();
      const buttonWidth = Math.min(320, Math.max(240, Math.floor(target.clientWidth)));
      googleIdentity.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (!credential) {
            setError(t('auth.googleCredentialMissing'));
            return;
          }
          setError(null);
          void onCredential(credential).catch((loginError: unknown) => {
            setError(loginError instanceof Error ? loginError.message : t('auth.loginFailed'));
          });
        },
      });
      googleIdentity.renderButton(target, {
        theme: 'outline',
        size: 'large',
        width: buttonWidth,
        text: 'continue_with',
        shape: 'pill',
      });
    };

    initialize();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.google?.accounts?.id?.cancel();
    };
  }, [clientId, onCredential, t]);

  return (
    <div>
      <div
        className="google-sign-in-slot"
        ref={buttonRef}
        aria-label={t('auth.continueWithGoogle')}
      />
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
