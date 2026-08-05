import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadAcademicImage } from '../api/academicAdminApi';
import type { AcademicImage, ProvenanceInput } from '../types';

interface ImageUploaderProps {
  onUploaded: (image: AcademicImage, altText: string, caption?: string) => void;
}

export function ImageUploader({ onUploaded }: ImageUploaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [origin, setOrigin] = useState<'YUKCSCA_ORIGINAL' | 'LICENSED' | 'OPEN_LICENSE'>(
    'YUKCSCA_ORIGINAL',
  );
  const [provider, setProvider] = useState('');
  const [permissionReference, setPermissionReference] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Image file size exceeds the 5 MiB limit.');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(selectedFile.type)) {
      setError('Only PNG and JPEG formats are supported.');
      return;
    }
    setError(null);
    setFile(selectedFile);
    if (!altText) {
      setAltText(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !altText.trim()) return;

    setIsUploading(true);
    setError(null);

    const provenance: ProvenanceInput = {
      origin,
      provider: provider || null,
      permissionReference: permissionReference || null,
    };

    try {
      const uploadedImage = await uploadAcademicImage(file, provenance);
      onUploaded(uploadedImage, altText, caption || undefined);
      setFile(null);
      setAltText('');
      setCaption('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        padding: 'var(--space-md)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-canvas)',
      }}
    >
      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
        {t('admin.academic.blocks.uploadImage')}
      </h4>

      {error ? (
        <div className="error-message" role="alert" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : null}

      {!file ? (
        <div
          className="image-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Upload diagram image file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
          <p style={{ margin: 0, fontWeight: 650, fontSize: '0.9rem' }}>
            Click or drag PNG / JPEG diagram (max 5MB, up to 4096px)
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <img
              src={URL.createObjectURL(file)}
              alt="Diagram preview"
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 650, fontSize: '0.9rem' }}>{file.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
                {(file.size / 1024).toFixed(1)} KB · {file.type}
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  marginTop: 'var(--space-xs)',
                }}
                onClick={() => setFile(null)}
              >
                Change File
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="img-alt" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              {t('admin.academic.blocks.altText')}{' '}
              <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              id="img-alt"
              type="text"
              className="text-input"
              style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="e.g. Diagram of triangle ABC with right angle at C"
            />
          </div>

          <div>
            <label htmlFor="img-caption" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              {t('admin.academic.blocks.caption')}
            </label>
            <input
              id="img-caption"
              type="text"
              className="text-input"
              style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Figure 1.1"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <div>
              <label htmlFor="img-origin" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                Content Origin
              </label>
              <select
                id="img-origin"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
                value={origin}
                onChange={(e) => setOrigin(e.target.value as typeof origin)}
              >
                <option value="YUKCSCA_ORIGINAL">YukCSCA Original</option>
                <option value="LICENSED">Licensed Provider</option>
                <option value="OPEN_LICENSE">Open Licence</option>
              </select>
            </div>

            {origin !== 'YUKCSCA_ORIGINAL' && (
              <>
                <div>
                  <label htmlFor="img-provider" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                    Provider Name
                  </label>
                  <input
                    id="img-provider"
                    type="text"
                    className="text-input"
                    style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. OpenStax / CC BY-SA"
                  />
                </div>

                <div>
                  <label htmlFor="img-perm-ref" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                    Permission Reference
                  </label>
                  <input
                    id="img-perm-ref"
                    type="text"
                    className="text-input"
                    style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
                    value={permissionReference}
                    onChange={(e) => setPermissionReference(e.target.value)}
                    placeholder="License ID or ticket ref"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ minHeight: '40px', marginTop: 'var(--space-xs)' }}
            onClick={handleUpload}
            disabled={isUploading || !altText.trim()}
          >
            {isUploading ? 'Uploading...' : 'Confirm Upload Diagram'}
          </button>
        </div>
      )}
    </div>
  );
}
