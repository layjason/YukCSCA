import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminRemoveButton } from './AdminRemoveButton';
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
    <div className="admin-split-editor admin-split-editor-wide">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header">
          <h3 className="admin-sidebar-title">{t('admin.academic.outline.title')}</h3>
          <button
            type="button"
            className="btn-secondary admin-btn-compact-md"
            onClick={handleAddItem}
          >
            + {t('admin.academic.outline.addItem')}
          </button>
        </div>

        <div className="admin-stack-micro">
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
                className={`outline-tree-item admin-list-button-bare ${isSelected ? 'outline-tree-item-selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="admin-ellipsis">
                  <span className="admin-list-index-muted">
                    {item.sourcePosition?.section || `${index + 1}`}
                  </span>
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedItem ? (
        <div className="admin-stack-md">
          <div className="admin-row-between">
            <div className="admin-row">
              <span className="yukcsca-tag">{t('admin.academic.outline.yukcscaAuthoredTag')}</span>
              <h4 className="admin-detail-title">
                {selectedItem.sourcePosition?.section
                  ? `Section ${selectedItem.sourcePosition.section}`
                  : 'Outline Detail'}
              </h4>
            </div>
            {items.length > 1 && (
              <AdminRemoveButton
                label={t('admin.academic.outline.remove')}
                onClick={() => handleDeleteItem(selectedItem.id)}
              />
            )}
          </div>

          <div className="admin-grid-2">
            <div>
              <label htmlFor="source-page" className="admin-field-label">
                {t('admin.academic.outline.page')}
              </label>
              <input
                id="source-page"
                type="number"
                className="text-input admin-field-control"
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
              <label htmlFor="source-section" className="admin-field-label">
                {t('admin.academic.outline.section')}
              </label>
              <input
                id="source-section"
                type="text"
                className="text-input admin-field-control"
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

          <div className="admin-stack-sm">
            <div>
              <label htmlFor="summary-id" className="admin-field-label">
                {t('admin.academic.outline.summaryId')} <span className="admin-required">*</span>
              </label>
              <textarea
                id="summary-id"
                className="text-input admin-field-control-resize"
                rows={2}
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
              <label htmlFor="summary-en" className="admin-field-label">
                {t('admin.academic.outline.summaryEn')} <span className="admin-required">*</span>
              </label>
              <textarea
                id="summary-en"
                className="text-input admin-field-control-resize"
                rows={2}
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
              <label htmlFor="summary-zh" className="admin-field-label">
                {t('admin.academic.outline.summaryZh')} <span className="admin-required">*</span>
              </label>
              <textarea
                id="summary-zh"
                className="text-input admin-field-control-resize"
                rows={2}
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
