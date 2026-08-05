import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ArchiveModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isArchiving?: boolean;
}

export function ArchiveModal({
  onConfirm,
  onClose,
  isArchiving = false,
}: ArchiveModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="archive-modal-title">{t('admin.academic.archiveModal.title')}</h2>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '32px', padding: '2px 8px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', margin: 0 }}>
            {t('admin.academic.archiveModal.warning')}
          </p>

          <div>
            <label htmlFor="archive-reason" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              {t('admin.academic.archiveModal.reasonLabel')}{' '}
              <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              id="archive-reason"
              className="text-input"
              rows={3}
              style={{ width: '100%', marginTop: 'var(--space-xxs)', resize: 'vertical' }}
              value={reason}
              placeholder={t('admin.academic.archiveModal.reasonPlaceholder')}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isArchiving}
            >
              {t('admin.academic.archiveModal.cancel')}
            </button>
            <button type="submit" className="btn-danger" disabled={isArchiving || !reason.trim()}>
              {isArchiving
                ? t('admin.academic.archiving')
                : t('admin.academic.archiveModal.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
