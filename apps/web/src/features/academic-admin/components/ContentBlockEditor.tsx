import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KaTeXPreview } from './KaTeXPreview';
import { ImageUploader } from './ImageUploader';
import { AcademicImageThumb } from './AcademicImageThumb';
import { AdminRemoveButton } from './AdminRemoveButton';
import { useAdminNotify } from '../adminNotify';
import type { ContentBlock, AcademicImage } from '../types';

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (updated: ContentBlock[]) => void;
  label?: string;
  compact?: boolean;
}

export function ContentBlockEditor({
  blocks,
  onChange,
  label,
  compact = false,
}: ContentBlockEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const notify = useAdminNotify();
  const [showImageUploader, setShowImageUploader] = useState(false);

  const handleAddText = () => {
    onChange([...blocks, { kind: 'TEXT', text: '' }]);
    notify(
      t('admin.academic.toasts.added', { name: t('admin.academic.toasts.names.textBlock') }),
      'success',
    );
  };

  const handleAddMath = () => {
    onChange([
      ...blocks,
      { kind: 'MATH', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', displayMode: true },
    ]);
    notify(
      t('admin.academic.toasts.added', { name: t('admin.academic.toasts.names.mathBlock') }),
      'success',
    );
  };

  const handleUpdateBlock = (index: number, updated: ContentBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const handleRemoveBlock = (index: number) => {
    const target = blocks[index];
    onChange(blocks.filter((_, i) => i !== index));
    const nameKey =
      target?.kind === 'MATH'
        ? 'admin.academic.toasts.names.mathBlock'
        : target?.kind === 'IMAGE'
          ? 'admin.academic.toasts.names.imageBlock'
          : 'admin.academic.toasts.names.textBlock';
    notify(t('admin.academic.toasts.removed', { name: t(nameKey) }), 'error');
  };

  const handleImageUploaded = (image: AcademicImage, altText: string, caption?: string) => {
    onChange([
      ...blocks,
      {
        kind: 'IMAGE',
        imageId: image.id,
        altText,
        caption: caption || null,
      },
    ]);
    setShowImageUploader(false);
    notify(
      t('admin.academic.toasts.added', { name: t('admin.academic.toasts.names.imageBlock') }),
      'success',
    );
  };

  return (
    <div className={`admin-block-list${compact ? ' admin-block-list-compact' : ''}`}>
      {label ? <h4 className="admin-section-title">{label}</h4> : null}

      {blocks.map((block, index) => (
        <div key={index} className="admin-block-card">
          <div className="admin-block-card-header">
            <span className="yukcsca-tag admin-tag-compact">{block.kind}</span>
            <AdminRemoveButton
              label={t('admin.academic.blocks.deleteBlock')}
              onClick={() => handleRemoveBlock(index)}
            />
          </div>

          {block.kind === 'TEXT' && (
            <textarea
              className="text-input admin-field-control-resize-only"
              rows={compact ? 2 : 3}
              value={block.text}
              maxLength={12000}
              placeholder={t('admin.academic.blocks.textPlaceholder')}
              onChange={(e) => handleUpdateBlock(index, { kind: 'TEXT', text: e.target.value })}
            />
          )}

          {block.kind === 'MATH' && (
            <div className="admin-stack-xs">
              <div className="admin-block-math-row">
                <input
                  type="text"
                  className="text-input admin-block-math-input"
                  value={block.latex}
                  maxLength={4000}
                  placeholder={t('admin.academic.blocks.latexPlaceholder')}
                  onChange={(e) => handleUpdateBlock(index, { ...block, latex: e.target.value })}
                  aria-describedby={`math-latex-hint-${index}`}
                />
                <label className="admin-display-mode">
                  <input
                    type="checkbox"
                    checked={block.displayMode}
                    onChange={(e) =>
                      handleUpdateBlock(index, { ...block, displayMode: e.target.checked })
                    }
                  />
                  {t('admin.academic.blocks.displayMode')}
                </label>
              </div>
              <p id={`math-latex-hint-${index}`} className="admin-hint">
                {t('admin.academic.blocks.latexSafetyHint')}
              </p>
              {block.latex && (block.latex.includes('<') || block.latex.includes('>')) ? (
                <p className="admin-field-error" role="status">
                  {t('admin.academic.blocks.latexAngleBracketWarning')}
                </p>
              ) : null}

              {block.latex ? (
                <KaTeXPreview latex={block.latex} displayMode={block.displayMode} />
              ) : null}
            </div>
          )}

          {block.kind === 'IMAGE' && (
            <div className="admin-image-ref">
              <AcademicImageThumb
                imageId={block.imageId}
                altText={block.altText}
                caption={block.caption}
              />
              <div className="admin-image-ref-body admin-stack-xs">
                <div>
                  <label htmlFor={`img-alt-${index}`} className="admin-field-label">
                    {t('admin.academic.blocks.altText')} <span className="admin-required">*</span>
                  </label>
                  <input
                    id={`img-alt-${index}`}
                    type="text"
                    className="text-input admin-field-control"
                    value={block.altText}
                    maxLength={500}
                    onChange={(e) =>
                      handleUpdateBlock(index, {
                        ...block,
                        altText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`img-caption-${index}`} className="admin-field-label">
                    {t('admin.academic.blocks.caption')}
                  </label>
                  <input
                    id={`img-caption-${index}`}
                    type="text"
                    className="text-input admin-field-control"
                    value={block.caption ?? ''}
                    maxLength={1000}
                    onChange={(e) =>
                      handleUpdateBlock(index, {
                        ...block,
                        caption: e.target.value.trim() ? e.target.value : null,
                      })
                    }
                  />
                </div>
                <p className="admin-image-ref-hint">{t('admin.academic.blocks.clickToEnlarge')}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/*
        One resource/question version can hold many IMAGE blocks.
        Backend accepts one file per POST; each successful upload appends a block.
        Keep add-actions visible while the uploader is open so more content can be added after.
      */}
      {showImageUploader ? (
        <ImageUploader
          onUploaded={handleImageUploaded}
          onCancel={() => setShowImageUploader(false)}
        />
      ) : null}

      <div className="admin-equal-actions admin-block-add-actions" data-count="3">
        <button
          type="button"
          className="btn-secondary admin-btn-compact-md"
          onClick={handleAddText}
        >
          + {t('admin.academic.blocks.addText')}
        </button>

        <button
          type="button"
          className="btn-secondary admin-btn-compact-md"
          onClick={handleAddMath}
        >
          + {t('admin.academic.blocks.addMath')}
        </button>

        <button
          type="button"
          className="btn-secondary admin-btn-compact-md"
          onClick={() => setShowImageUploader(true)}
          disabled={showImageUploader}
          aria-pressed={showImageUploader}
        >
          + {t('admin.academic.blocks.addImage')}
        </button>
      </div>
    </div>
  );
}
