import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KaTeXPreview } from './KaTeXPreview';
import { ImageUploader } from './ImageUploader';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {label && <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{label}</h4>}

      {blocks.map((block, index) => (
        <div
          key={index}
          style={{
            padding: 'var(--space-sm)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-soft)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="yukcsca-tag" style={{ fontSize: '0.65rem' }}>
              {block.kind}
            </span>
            <button
              type="button"
              className="btn-danger"
              style={{ minHeight: '26px', padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={() => handleRemoveBlock(index)}
            >
              Delete Block
            </button>
          </div>

          {block.kind === 'TEXT' && (
            <textarea
              className="text-input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              value={block.text}
              placeholder="Enter text content..."
              onChange={(e) => handleUpdateBlock(index, { kind: 'TEXT', text: e.target.value })}
            />
          )}

          {block.kind === 'MATH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <input
                  type="text"
                  className="text-input"
                  style={{ flex: 1 }}
                  value={block.latex}
                  placeholder={t('admin.academic.blocks.latexPlaceholder')}
                  onChange={(e) => handleUpdateBlock(index, { ...block, latex: e.target.value })}
                />
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={block.displayMode}
                    onChange={(e) =>
                      handleUpdateBlock(index, { ...block, displayMode: e.target.checked })
                    }
                  />
                  Display Mode
                </label>
              </div>

              {block.latex && <KaTeXPreview latex={block.latex} displayMode={block.displayMode} />}
            </div>
          )}

          {block.kind === 'IMAGE' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'var(--color-block-sky)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                IMG
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 650, fontSize: '0.85rem' }}>
                  Alt: {block.altText}
                </p>
                {block.caption && (
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-muted)',
                    }}
                  >
                    Caption: {block.caption}
                  </p>
                )}
                <p
                  style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}
                >
                  ID: {block.imageId}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {showImageUploader ? (
        <ImageUploader onUploaded={handleImageUploaded} />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={handleAddText}
          >
            + {t('admin.academic.blocks.addText')}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={handleAddMath}
          >
            + {t('admin.academic.blocks.addMath')}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setShowImageUploader(true)}
          >
            + {t('admin.academic.blocks.addImage')}
          </button>
        </div>
      )}
    </div>
  );
}
