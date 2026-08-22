import { Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import './term-practice.css';

export function TermPracticeDock({
  tone,
  idleLabel,
  title,
  actionLabel,
  onAction,
  actionDisabled = false,
  busy = false,
}: {
  tone: 'idle' | 'correct' | 'incorrect';
  idleLabel: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  busy?: boolean;
}): React.JSX.Element {
  const dock =
    tone === 'idle' ? (
      <div className="term-outcome-dock">
        <button
          type="button"
          className="btn-primary term-outcome-check"
          disabled={actionDisabled || busy || !onAction}
          onClick={onAction}
        >
          {idleLabel}
        </button>
      </div>
    ) : (
      <div className={`term-outcome-dock is-${tone}`} role="status">
        <p className="term-outcome-lead">
          <span className="term-outcome-mark" aria-hidden="true">
            {tone === 'correct' ? (
              <Check size={16} strokeWidth={3} />
            ) : (
              <X size={16} strokeWidth={3} />
            )}
          </span>
          {title}
        </p>
        <button
          type="button"
          className="btn-primary term-outcome-continue"
          disabled={busy || !onAction}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    );

  return createPortal(dock, document.body);
}
