import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KaTeXPreview } from './KaTeXPreview';
import { ImageUploader } from './ImageUploader';
import { AdminRemoveButton } from './AdminRemoveButton';
import type { ContentBlock, AcademicImage } from '../types';

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (updated: ContentBlock[]) => void;
  label?: string;
}

export function ContentBlockEditor({
  blocks,
  onChange,
  label,
}: ContentBlockEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showImageUploader, setShowImageUploader] = useState(false);

  const handleAddText = () => {
    onChange([...blocks, { kind: 'TEXT', text: '' }]);
  };

  const handleAddMath = () => {
    onChange([
      ...blocks,
      { kind: 'MATH', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', displayMode: true },
    ]);
  };

  const handleUpdateBlock = (index: number, updated: ContentBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const handleRemoveBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
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
  };

  return (
    <div className="admin-block-list">
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
              rows={3}
              value={block.text}
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
                  placeholder={t('admin.academic.blocks.latexPlaceholder')}
                  onChange={(e) => handleUpdateBlock(index, { ...block, latex: e.target.value })}
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

              {block.latex ? (
                <KaTeXPreview latex={block.latex} displayMode={block.displayMode} />
              ) : null}
            </div>
          )}

          {block.kind === 'IMAGE' && (
            <div className="admin-image-ref">
              <div className="admin-image-ref-thumb">IMG</div>
              <div className="admin-image-ref-body">
                <p className="admin-image-ref-title">Alt: {block.altText}</p>
                {block.caption ? (
                  <p className="admin-image-ref-meta">Caption: {block.caption}</p>
                ) : null}
                <p className="admin-image-ref-id">ID: {block.imageId}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {showImageUploader ? (
        <ImageUploader onUploaded={handleImageUploaded} />
      ) : (
        <div className="admin-row-wrap">
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
          >
            + {t('admin.academic.blocks.addImage')}
          </button>
        </div>
      )}
    </div>
  );
}
