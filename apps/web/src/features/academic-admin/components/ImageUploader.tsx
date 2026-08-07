import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readFileAsDataUrl, uploadAcademicImage } from '../api/academicAdminApi';
import type { AcademicImage, ProvenanceInput } from '../types';

interface ImageUploaderProps {
  onUploaded: (image: AcademicImage, altText: string, caption?: string) => void;
  onCancel?: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_TYPES = ['image/png', 'image/jpeg'];

/**
 * Single-file diagram uploader aligned with
 * `POST /api/v1/admin/academic-images` (one `file` part per request).
 *
 * Local preview uses data: URLs so Content-Security-Policy img-src (self data:
 * …) allows the thumbnail without requiring blob:.
 */
export function ImageUploader({ onUploaded, onCancel }: ImageUploaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [origin, setOrigin] = useState<'YUKCSCA_ORIGINAL' | 'LICENSED' | 'OPEN_LICENSE'>(
    'YUKCSCA_ORIGINAL',
  );
  const [provider, setProvider] = useState('');
  const [sourceLocator, setSourceLocator] = useState('');
  const [permissionReference, setPermissionReference] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySelectedFile = async (selectedFile: File | undefined | null) => {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_BYTES) {
      setError(t('admin.academic.blocks.imageTooLarge'));
      return;
    }
    if (!ACCEPT_TYPES.includes(selectedFile.type)) {
      setError(t('admin.academic.blocks.imageTypeInvalid'));
      return;
    }
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      setFile(selectedFile);
      setPreviewUrl(dataUrl);
      setAltText((current) => current || selectedFile.name.replace(/\.[^/.]+$/, ''));
    } catch {
      setError(t('admin.academic.blocks.uploadFailed'));
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleChangeFile = () => {
    openFilePicker();
  };

  const handleClearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetAfterUpload = () => {
    setFile(null);
    setPreviewUrl(null);
    setAltText('');
    setCaption('');
    setProvider('');
    setSourceLocator('');
    setPermissionReference('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !altText.trim()) return;
    if (
      origin !== 'YUKCSCA_ORIGINAL' &&
      (!provider.trim() || !sourceLocator.trim() || !permissionReference.trim())
    ) {
      setError(t('admin.academic.blocks.licensedFieldsRequired'));
      return;
    }

    setIsUploading(true);
    setError(null);

    const provenance: ProvenanceInput = {
      origin,
      provider: provider.trim() || null,
      sourceLocator: sourceLocator.trim() || null,
      permissionReference: permissionReference.trim() || null,
    };

    try {
      const uploadedImage = await uploadAcademicImage(file, provenance);
      onUploaded(uploadedImage, altText, caption || undefined);
      resetAfterUpload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.academic.blocks.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="admin-image-uploader">
      <div className="admin-row-between">
        <h4 className="admin-image-uploader-title">{t('admin.academic.blocks.uploadImage')}</h4>
        {onCancel ? (
          <button type="button" className="btn-secondary admin-btn-compact-sm" onClick={onCancel}>
            {t('admin.academic.blocks.cancelUpload')}
          </button>
        ) : null}
      </div>

      <p className="admin-muted-sm">{t('admin.academic.blocks.uploadOneFileHint')}</p>

      {error ? (
        <div className="error-message admin-image-error" role="alert">
          {error}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="admin-file-input-hidden"
        onChange={(e) => {
          void applySelectedFile(e.target.files?.[0]);
        }}
      />

      {!file ? (
        <div
          className={`image-dropzone ${isDragging ? 'image-dropzone-active' : ''}`}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            void applySelectedFile(e.dataTransfer.files?.[0]);
          }}
          tabIndex={0}
          role="button"
          aria-label={t('admin.academic.blocks.dropzoneAria')}
        >
          <p className="image-dropzone-label">{t('admin.academic.blocks.dropzoneLabel')}</p>
          <p className="admin-muted-sm">{t('admin.academic.blocks.dropzoneHint')}</p>
        </div>
      ) : (
        <div className="admin-stack-sm">
          <div className="admin-image-preview-row">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t('admin.academic.blocks.previewAlt')}
                className="admin-image-preview-thumb"
              />
            ) : (
              <div className="admin-image-ref-thumb">…</div>
            )}
            <div className="admin-image-preview-meta-block">
              <p className="admin-image-preview-name">{file.name}</p>
              <p className="admin-image-preview-meta">
                {(file.size / 1024).toFixed(1)} KB · {file.type}
              </p>
              <div className="admin-row-wrap">
                <button
                  type="button"
                  className="btn-secondary admin-btn-micro"
                  onClick={handleChangeFile}
                >
                  {t('admin.academic.blocks.changeFile')}
                </button>
                <button
                  type="button"
                  className="btn-secondary admin-btn-micro"
                  onClick={handleClearFile}
                >
                  {t('admin.academic.blocks.removeFile')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="img-alt" className="admin-field-label">
              {t('admin.academic.blocks.altText')} <span className="admin-required">*</span>
            </label>
            <input
              id="img-alt"
              type="text"
              className="text-input admin-field-control"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder={t('admin.academic.blocks.altPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="img-caption" className="admin-field-label">
              {t('admin.academic.blocks.caption')}
            </label>
            <input
              id="img-caption"
              type="text"
              className="text-input admin-field-control"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('admin.academic.blocks.captionPlaceholder')}
            />
          </div>

          <div className="admin-grid-2">
            <div>
              <label htmlFor="img-origin" className="admin-field-label">
                {t('admin.academic.blocks.contentOrigin')}
              </label>
              <select
                id="img-origin"
                className="text-input admin-field-control"
                value={origin}
                onChange={(e) => setOrigin(e.target.value as typeof origin)}
              >
                <option value="YUKCSCA_ORIGINAL">
                  {t('admin.academic.blocks.originOriginal')}
                </option>
                <option value="LICENSED">{t('admin.academic.blocks.originLicensed')}</option>
                <option value="OPEN_LICENSE">{t('admin.academic.blocks.originOpen')}</option>
              </select>
            </div>

            {origin !== 'YUKCSCA_ORIGINAL' && (
              <>
                <div>
                  <label htmlFor="img-provider" className="admin-field-label">
                    {t('admin.academic.blocks.provider')}
                  </label>
                  <input
                    id="img-provider"
                    type="text"
                    className="text-input admin-field-control"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="img-source-locator" className="admin-field-label">
                    {t('admin.academic.blocks.sourceLocator')}
                  </label>
                  <input
                    id="img-source-locator"
                    type="text"
                    className="text-input admin-field-control"
                    value={sourceLocator}
                    onChange={(e) => setSourceLocator(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="img-perm-ref" className="admin-field-label">
                    {t('admin.academic.blocks.permissionReference')}
                  </label>
                  <input
                    id="img-perm-ref"
                    type="text"
                    className="text-input admin-field-control"
                    value={permissionReference}
                    onChange={(e) => setPermissionReference(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn-primary admin-btn-upload"
            onClick={handleUpload}
            disabled={isUploading || !altText.trim()}
          >
            {isUploading
              ? t('admin.academic.blocks.uploading')
              : t('admin.academic.blocks.confirmUpload')}
          </button>
        </div>
      )}
    </div>
  );
}
