import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SyllabusOutlineItem } from '../types';

interface SyllabusOutlineEditorProps {
  items: SyllabusOutlineItem[];
  onChange: (updated: SyllabusOutlineItem[]) => void;
}

export function SyllabusOutlineEditor({
  items,
  onChange,
}: SyllabusOutlineEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);

  const selectedItem = items.find((i) => i.id === selectedId) || items[0];

  const handleAddItem = () => {
    const newItem: SyllabusOutlineItem = {
      id: crypto.randomUUID(),
      parentId: null,
      order: items.length + 1,
      sourcePosition: { page: 1, section: `1.${items.length + 1}` },
      summary: {
        indonesian: '',
        english: '',
        simplifiedChinese: '',
      },
    };
    onChange([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const handleUpdateItem = (updated: SyllabusOutlineItem) => {
    onChange(items.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) return;
    const filtered = items.filter((i) => i.id !== id);
    onChange(filtered);
    if (selectedId === id) {
      setSelectedId(filtered[0]?.id || null);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 300px) 1fr',
        gap: 'var(--space-lg)',
      }}
    >
      {/* Sidebar List */}
      <div
        style={{ borderRight: '1px solid var(--color-border)', paddingRight: 'var(--space-md)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-md)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {t('admin.academic.outline.title')}
          </h3>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={handleAddItem}
          >
            + {t('admin.academic.outline.addItem')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map((item, index) => {
            const isSelected = item.id === selectedItem?.id;
            const label =
              item.summary.english ||
              item.summary.indonesian ||
              item.summary.simplifiedChinese ||
              `Item ${index + 1}`;
            return (
              <button
                key={item.id}
                type="button"
                className={`outline-tree-item ${isSelected ? 'outline-tree-item-selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
                style={{ textAlign: 'left', border: 0, width: '100%' }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-muted)',
                      marginRight: '6px',
                    }}
                  >
                    {item.sourcePosition?.section || `${index + 1}`}
                  </span>
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Main */}
      {selectedItem ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span className="yukcsca-tag">{t('admin.academic.outline.yukcscaAuthoredTag')}</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {selectedItem.sourcePosition?.section
                  ? `Section ${selectedItem.sourcePosition.section}`
                  : 'Outline Detail'}
              </h4>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                className="btn-danger"
                style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={() => handleDeleteItem(selectedItem.id)}
              >
                Remove
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <div>
              <label htmlFor="source-page" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.outline.page')}
              </label>
              <input
                id="source-page"
                type="number"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
                value={selectedItem.sourcePosition?.page ?? ''}
                onChange={(e) =>
                  handleUpdateItem({
                    ...selectedItem,
                    sourcePosition: {
                      ...selectedItem.sourcePosition,
                      page: e.target.value ? parseInt(e.target.value, 10) : null,
                    },
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="source-section" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.outline.section')}
              </label>
              <input
                id="source-section"
                type="text"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
                value={selectedItem.sourcePosition?.section ?? ''}
                onChange={(e) =>
                  handleUpdateItem({
                    ...selectedItem,
                    sourcePosition: {
                      ...selectedItem.sourcePosition,
                      section: e.target.value || null,
                    },
                  })
                }
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-xs)',
            }}
          >
            <div>
              <label htmlFor="summary-id" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.outline.summaryId')}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="summary-id"
                className="text-input"
                rows={2}
                style={{ width: '100%', marginTop: 'var(--space-xxs)', resize: 'vertical' }}
                value={selectedItem.summary.indonesian || ''}
                onChange={(e) =>
                  handleUpdateItem({
                    ...selectedItem,
                    summary: { ...selectedItem.summary, indonesian: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="summary-en" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.outline.summaryEn')}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="summary-en"
                className="text-input"
                rows={2}
                style={{ width: '100%', marginTop: 'var(--space-xxs)', resize: 'vertical' }}
                value={selectedItem.summary.english || ''}
                onChange={(e) =>
                  handleUpdateItem({
                    ...selectedItem,
                    summary: { ...selectedItem.summary, english: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="summary-zh" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.outline.summaryZh')}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="summary-zh"
                className="text-input"
                rows={2}
                style={{ width: '100%', marginTop: 'var(--space-xxs)', resize: 'vertical' }}
                value={selectedItem.summary.simplifiedChinese || ''}
                onChange={(e) =>
                  handleUpdateItem({
                    ...selectedItem,
                    summary: { ...selectedItem.summary, simplifiedChinese: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
