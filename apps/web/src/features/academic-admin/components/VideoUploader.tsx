import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ProvenanceEditor } from './ProvenanceEditor';
import {
  createVideoUploadSlot,
  uploadVideoBytesToSlot,
  confirmVideoUpload,
  ApiError,
} from '../api/academicAdminApi';
import {
  toDraftProvenanceInput,
  toEditableProvenance,
  type EditableProvenance,
} from '../provenanceDraft';
import type { AcademicVideoAsset, ExplanationLanguage } from '../types';

interface VideoUploaderProps {
  explanationLanguage: ExplanationLanguage;
  onSuccess: (asset: AcademicVideoAsset) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const MAX_VIDEO_BYTE_SIZE = 209715200; // 200 MiB (CR-06 maxByteSize)

export function VideoUploader({
  explanationLanguage,
  onSuccess,
  onCancel,
  disabled = false,
}: VideoUploaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [provenance, setProvenance] = useState<EditableProvenance>(
    toEditableProvenance({ origin: 'YUKCSCA_ORIGINAL' }),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    const isMp4 = selected.type === 'video/mp4' || selected.name.toLowerCase().endsWith('.mp4');
    if (!isMp4) {
      setError(t('admin.academic.video.uploader.fileTypeError'));
      setFile(null);
      return;
    }

    if (selected.size > MAX_VIDEO_BYTE_SIZE) {
      setError(t('admin.academic.video.uploader.fileSizeError', { max: '200 MiB' }));
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading || disabled) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Create upload slot
      const slot = await createVideoUploadSlot(explanationLanguage);

      // 2. Upload raw bytes to presigned URL
      await uploadVideoBytesToSlot(slot.uploadUrl, file);

      // 3. Confirm upload with provenance
      const provInput = toDraftProvenanceInput(provenance);
      const asset = await confirmVideoUpload(slot.id, {
        origin: provInput.origin ?? 'YUKCSCA_ORIGINAL',
        provider: provInput.provider ?? null,
        sourceLocator: provInput.sourceLocator ?? null,
        permissionReference: provInput.permissionReference ?? null,
      });

      onSuccess(asset);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('admin.academic.video.uploader.uploading'));
      }
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, uploading]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-uploader-title"
      onClick={() => !uploading && onCancel()}
    >
      <div className="modal-content admin-stack-md" onClick={(e) => e.stopPropagation()}>
        <div className="admin-row-between">
          <h3 id="video-uploader-title" className="admin-detail-title">
            {t('admin.academic.video.uploader.title', {
              language: explanationLanguage,
            })}
          </h3>
          <button
            type="button"
            className="btn-secondary admin-btn-icon"
            aria-label={t('admin.academic.video.uploader.cancel')}
            title={t('admin.academic.video.uploader.cancel')}
            onClick={onCancel}
            disabled={uploading}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-stack-md">
          {error ? (
            <div className="state-notice state-notice-error" role="alert">
              <p>{error}</p>
            </div>
          ) : null}

          <div>
            <label htmlFor="video-file-input" className="admin-field-label">
              {t('admin.academic.video.uploader.fileLabel')}{' '}
              <span className="admin-required">*</span>
            </label>
            <input
              id="video-file-input"
              type="file"
              accept="video/mp4,.mp4"
              className="text-input admin-field-control"
              onChange={handleFileChange}
              disabled={uploading || disabled}
            />
            {file ? (
              <p className="admin-hint">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            ) : null}
          </div>

          <ProvenanceEditor
            idPrefix="video-uploader-prov"
            value={provenance}
            onChange={setProvenance}
            disabled={uploading || disabled}
          />

          <div className="admin-actions-end">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={uploading}>
              {t('admin.academic.video.uploader.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!file || uploading || disabled}
              aria-busy={uploading}
            >
              {uploading
                ? t('admin.academic.video.uploader.uploading')
                : t('admin.academic.video.uploader.submitUpload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
