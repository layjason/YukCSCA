import { useTranslation } from 'react-i18next';
import type { AcademicValidationViolation } from '../types';

interface PublishValidationModalProps {
  violations: AcademicValidationViolation[];
  onClose: () => void;
}

export function PublishValidationModal({
  violations,
  onClose,
}: PublishValidationModalProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-modal-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="validation-modal-title" style={{ color: 'var(--color-danger)' }}>
            ⚠️ {t('admin.academic.validation.title')}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '32px', padding: '2px 8px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            color: 'var(--color-ink-muted)',
            fontSize: '0.9rem',
            margin: '0 0 var(--space-md)',
          }}
        >
          {t('admin.academic.validation.subtitle')}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {violations.map((v, i) => (
            <div
              key={i}
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
              }}
            >
              <strong>{v.path}</strong>: <code>{v.code}</code>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
          <button type="button" className="btn-primary" onClick={onClose}>
            {t('admin.academic.validation.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
