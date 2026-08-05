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
  const [sourceLocator, setSourceLocator] = useState('');
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
    if (
      origin !== 'YUKCSCA_ORIGINAL' &&
      (!provider.trim() || !sourceLocator.trim() || !permissionReference.trim())
    ) {
      setError(
        'Licensed or open content requires provider, source locator, and permission reference.',
      );
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
      setFile(null);
      setAltText('');
      setCaption('');
      setProvider('');
      setSourceLocator('');
      setPermissionReference('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="admin-image-uploader">
      <h4 className="admin-image-uploader-title">{t('admin.academic.blocks.uploadImage')}</h4>

      {error ? (
        <div className="error-message admin-image-error" role="alert">
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
            className="admin-file-input-hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
          <p className="image-dropzone-label">
            Click or drag PNG / JPEG diagram (max 5MB, up to 4096px)
          </p>
        </div>
      ) : (
        <div className="admin-stack-sm">
          <div className="admin-image-preview-row">
            <img
              src={URL.createObjectURL(file)}
              alt="Diagram preview"
              className="admin-image-preview-thumb"
            />
            <div>
              <p className="admin-image-preview-name">{file.name}</p>
              <p className="admin-image-preview-meta">
                {(file.size / 1024).toFixed(1)} KB · {file.type}
              </p>
              <button
                type="button"
                className="btn-secondary admin-btn-micro"
                onClick={() => setFile(null)}
              >
                Change File
              </button>
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
              placeholder="e.g. Diagram of triangle ABC with right angle at C"
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
              placeholder="Figure 1.1"
            />
          </div>

          <div className="admin-grid-2">
            <div>
              <label htmlFor="img-origin" className="admin-field-label">
                Content Origin
              </label>
              <select
                id="img-origin"
                className="text-input admin-field-control"
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
                  <label htmlFor="img-provider" className="admin-field-label">
                    Provider Name
                  </label>
                  <input
                    id="img-provider"
                    type="text"
                    className="text-input admin-field-control"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. OpenStax / CC BY-SA"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="img-source-locator" className="admin-field-label">
                    Source Locator
                  </label>
                  <input
                    id="img-source-locator"
                    type="text"
                    className="text-input admin-field-control"
                    value={sourceLocator}
                    onChange={(e) => setSourceLocator(e.target.value)}
                    placeholder="URL, catalogue ID, or file reference"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="img-perm-ref" className="admin-field-label">
                    Permission Reference
                  </label>
                  <input
                    id="img-perm-ref"
                    type="text"
                    className="text-input admin-field-control"
                    value={permissionReference}
                    onChange={(e) => setPermissionReference(e.target.value)}
                    placeholder="License ID or ticket ref"
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
            {isUploading ? 'Uploading...' : 'Confirm Upload Diagram'}
          </button>
        </div>
      )}
    </div>
  );
}
