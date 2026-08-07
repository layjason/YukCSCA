import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAcademicImageObjectUrl } from '../api/academicAdminApi';

interface AcademicImageThumbProps {
  imageId: string;
  altText: string;
  caption?: string | null;
  className?: string;
}

/** Loads one admin-only academic image; click opens a larger preview modal. */
export function AcademicImageThumb(props: AcademicImageThumbProps): React.JSX.Element {
  // Remount when imageId changes so load state resets without setState-in-effect.
  return <AcademicImageThumbInner key={props.imageId} {...props} />;
}

function AcademicImageThumbInner({
  imageId,
  altText,
  caption,
  className = 'admin-image-ref-thumb-img',
}: AcademicImageThumbProps): React.JSX.Element {
  const { t } = useTranslation();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchAcademicImageObjectUrl(imageId)
      .then((url) => {
        if (!active) return;
        setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [imageId]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open]);

  if (failed) {
    return (
      <div className="admin-image-ref-thumb" role="img" aria-label={altText}>
        {t('admin.academic.blocks.imageUnavailable')}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="admin-image-ref-thumb admin-image-ref-thumb-loading" aria-busy="true">
        <span className="loading-indicator" aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="admin-image-thumb-button"
        onClick={() => setOpen(true)}
        aria-label={t('admin.academic.blocks.openImagePreview', { alt: altText })}
      >
        <img src={src} alt={altText} className={className} />
      </button>

      {open ? (
        <div
          className="modal-overlay admin-image-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div className="admin-image-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id={titleId} className="admin-image-preview-modal-title">
                {caption?.trim() || altText || t('admin.academic.blocks.imagePreviewTitle')}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="btn-secondary admin-btn-icon"
                onClick={() => setOpen(false)}
                aria-label={t('admin.academic.blocks.closeImagePreview')}
              >
                ✕
              </button>
            </div>
            <div className="admin-image-preview-modal-body">
              <img src={src} alt={altText} className="admin-image-preview-modal-img" />
            </div>
            {caption?.trim() && caption.trim() !== altText ? (
              <p className="admin-image-preview-modal-caption">{caption}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
