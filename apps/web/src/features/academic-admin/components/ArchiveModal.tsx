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
          <button type="button" className="btn-secondary admin-btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-body-text">{t('admin.academic.archiveModal.warning')}</p>

          <div>
            <label htmlFor="archive-reason" className="admin-field-label">
              {t('admin.academic.archiveModal.reasonLabel')}{' '}
              <span className="admin-required">*</span>
            </label>
            <textarea
              id="archive-reason"
              className="text-input admin-field-control-resize"
              rows={3}
              value={reason}
              placeholder={t('admin.academic.archiveModal.reasonPlaceholder')}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="admin-actions-end">
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
