import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './term-practice.css';

export function TermSheet({
  titleId,
  title,
  children,
  onDismiss,
  variant = 'sheet',
}: {
  titleId: string;
  title: string;
  children: ReactNode;
  onDismiss: () => void;
  variant?: 'sheet' | 'menu';
}): React.JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return createPortal(
    <div className={`term-sheet term-sheet-${variant}`} role="presentation" onClick={onDismiss}>
      <div
        className="term-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="term-sheet-handle" aria-hidden="true" />
        <h3 id={titleId} className="term-sheet-title">
          {title}
        </h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
