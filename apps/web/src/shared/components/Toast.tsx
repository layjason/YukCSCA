import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ToastTone = 'success' | 'info' | 'error';

export type ToastProps = {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. Pass 0 to keep until dismissed. Default 4000. */
  durationMs?: number;
};

/**
 * Viewport-fixed status toast: message + dismiss control.
 * Portaled to document.body so shell stacking contexts cannot trap it.
 */
export function Toast({
  message,
  tone = 'success',
  onDismiss,
  durationMs = 4000,
}: ToastProps): React.JSX.Element {
  const { t } = useTranslation();

  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return createPortal(
    <div className="toast-container" aria-live="polite">
      <div className={`toast toast-${tone}`} role="status">
        <p className="toast-message">{message}</p>
        <button
          type="button"
          className="toast-close"
          onClick={onDismiss}
          aria-label={t('toast.dismiss')}
        >
          <X className="toast-close-icon" aria-hidden="true" strokeWidth={2.25} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
