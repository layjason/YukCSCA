import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminRemoveButton } from './AdminRemoveButton';
import {
  canDeleteOutlineItem,
  createModule,
  createTopic,
  deleteOutlineItem,
  flattenOutlineForDisplay,
  isRootModule,
  modulesOf,
  outlineItemLabel,
  selectionAfterDelete,
  setOutlineParent,
} from '../outlineTree';
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
  const displayRows = useMemo(() => flattenOutlineForDisplay(items), [items]);
  const modules = useMemo(() => modulesOf(items), [items]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Prefer explicit selection when it still exists; otherwise first tree row.
  const selectedItem =
    (selectedId ? items.find((item) => item.id === selectedId) : undefined) ?? displayRows[0]?.item;
  const selectedRow = displayRows.find((row) => row.item.id === selectedItem?.id);

  const handleAddModule = () => {
    setActionError(null);
    const created = createModule(items);
    onChange([...items, created]);
    setSelectedId(created.id);
  };

  const handleAddTopic = () => {
    const parentId = resolveTopicParentId(items, selectedItem);
    if (!parentId) {
      setActionError(t('admin.academic.outline.needModuleForTopic'));
      return;
    }
    const created = createTopic(items, parentId);
    if (!created) {
      setActionError(t('admin.academic.outline.needModuleForTopic'));
      return;
    }
    setActionError(null);
    onChange([...items, created]);
    setSelectedId(created.id);
  };

  const handleUpdateItem = (updated: SyllabusOutlineItem) => {
    setActionError(null);
    onChange(items.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleParentChange = (nextParentId: string) => {
    if (!selectedItem) {
      setActionError(t('admin.academic.outline.parentChangeBlocked'));
      return;
    }
    const parentId = nextParentId === '' ? null : nextParentId;
    const next = setOutlineParent(items, selectedItem.id, parentId);
    if (!next) {
      setActionError(t('admin.academic.outline.parentChangeBlocked'));
      return;
    }
    setActionError(null);
    onChange(next);
  };

  const handleDeleteItem = (id: string) => {
    const allowed = canDeleteOutlineItem(items, id);
    if (!allowed.ok) {
      setActionError(t('admin.academic.outline.removeBlockedHasChildren'));
      return;
    }
    const next = deleteOutlineItem(items, id);
    if (!next) {
      setActionError(t('admin.academic.outline.removeBlockedHasChildren'));
      return;
    }
    setActionError(null);
    // Compute neighbor before state updates so selection follows the deleted row naturally.
    const nextSelectedId = selectionAfterDelete(items, id);
    onChange(next);
    if (selectedId === id || selectedItem?.id === id) {
      setSelectedId(nextSelectedId);
    }
  };

  return (
    <div className="admin-split-editor admin-split-editor-wide">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header admin-outline-sidebar-header">
          <div>
            <h3 className="admin-sidebar-title">{t('admin.academic.outline.title')}</h3>
            <p className="admin-muted-sm admin-outline-subtitle">
              {t('admin.academic.outline.subtitle')}
            </p>
          </div>
        </div>

        <div className="admin-outline-add-actions">
          <button
            type="button"
            className="btn-secondary admin-btn-compact-md"
            onClick={handleAddModule}
          >
            + {t('admin.academic.outline.addModule')}
          </button>
          <button
            type="button"
            className="btn-secondary admin-btn-compact-md"
            onClick={handleAddTopic}
            aria-describedby={actionError ? 'outline-action-error' : undefined}
          >
            + {t('admin.academic.outline.addTopic')}
          </button>
        </div>

        {actionError ? (
          <p id="outline-action-error" className="admin-field-error" role="alert">
            {actionError}
          </p>
        ) : null}

        {displayRows.length === 0 ? (
          <p className="admin-muted">{t('admin.academic.outline.empty')}</p>
        ) : (
          <div className="admin-outline-tree" role="list">
            {displayRows.map((row, index) => {
              const isSelected = row.item.id === selectedItem?.id;
              const label = outlineItemLabel(
                row.item,
                t('admin.academic.outline.untitled', { index: index + 1 }),
              );
              const kindLabel =
                row.kind === 'module'
                  ? t('admin.academic.outline.kindModule')
                  : row.kind === 'topic'
                    ? t('admin.academic.outline.kindTopic')
                    : t('admin.academic.outline.kindOrphan');

              return (
                <button
                  key={row.item.id}
                  type="button"
                  role="listitem"
                  className={[
                    'outline-tree-item',
                    'admin-list-button-bare',
                    `outline-tree-depth-${row.depth}`,
                    isSelected ? 'outline-tree-item-selected' : '',
                    row.kind === 'orphan' ? 'outline-tree-item-orphan' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setActionError(null);
                    setSelectedId(row.item.id);
                  }}
                >
                  <div className="admin-outline-row-main">
                    <span className="admin-outline-kind" aria-hidden="true">
                      {kindLabel}
                    </span>
                    <span className="admin-list-index-muted">
                      {row.item.sourcePosition?.section || `${index + 1}`}
                    </span>
                    <span className="admin-outline-row-label">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem ? (
        <div className="admin-stack-md">
          <div className="admin-row-between">
            <div className="admin-stack-xs">
              <div className="admin-row-wrap">
                <span className="yukcsca-tag">
                  {t('admin.academic.outline.yukcscaAuthoredTag')}
                </span>
                <span className="yukcsca-tag">
                  {selectedRow?.kind === 'topic'
                    ? t('admin.academic.outline.kindTopic')
                    : selectedRow?.kind === 'orphan'
                      ? t('admin.academic.outline.kindOrphan')
                      : t('admin.academic.outline.kindModule')}
                </span>
              </div>
              <h4 className="admin-detail-title">
                {selectedItem.sourcePosition?.section
                  ? t('admin.academic.outline.detailHeading', {
                      section: selectedItem.sourcePosition.section,
                    })
                  : t('admin.academic.outline.detailFallback')}
              </h4>
            </div>
            <AdminRemoveButton
              label={t('admin.academic.outline.remove')}
              onClick={() => handleDeleteItem(selectedItem.id)}
            />
          </div>

          {selectedRow?.kind === 'orphan' ? (
            <p className="admin-field-error" role="status">
              {t('admin.academic.outline.orphanHint')}
            </p>
          ) : null}

          <div>
            <label htmlFor="outline-parent" className="admin-field-label">
              {t('admin.academic.outline.parentLabel')}
            </label>
            <select
              id="outline-parent"
              className="text-input admin-field-control"
              value={selectedItem.parentId ?? ''}
              onChange={(e) => handleParentChange(e.target.value)}
              disabled={isRootModule(selectedItem) && childCountSafe(items, selectedItem.id) > 0}
            >
              <option value="">{t('admin.academic.outline.parentNone')}</option>
              {modules
                .filter((module) => module.id !== selectedItem.id)
                .map((module) => (
                  <option key={module.id} value={module.id}>
                    {outlineItemLabel(
                      module,
                      t('admin.academic.outline.untitledModule', { order: module.order + 1 }),
                    )}
                  </option>
                ))}
            </select>
            <p className="admin-muted-sm">{t('admin.academic.outline.parentHelp')}</p>
          </div>

          <div className="admin-grid-2">
            <div>
              <label htmlFor="source-page" className="admin-field-label">
                {t('admin.academic.outline.page')}
              </label>
              <input
                id="source-page"
                type="number"
                min={1}
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
      ) : (
        <p className="admin-muted">{t('admin.academic.outline.emptyDetail')}</p>
      )}
    </div>
  );
}

function resolveTopicParentId(
  items: SyllabusOutlineItem[],
  selected: SyllabusOutlineItem | undefined,
): string | null {
  if (!selected) {
    return modulesOf(items)[0]?.id ?? null;
  }
  if (isRootModule(selected)) return selected.id;
  if (
    selected.parentId &&
    items.some((item) => item.id === selected.parentId && isRootModule(item))
  ) {
    return selected.parentId;
  }
  return modulesOf(items)[0]?.id ?? null;
}

function childCountSafe(items: SyllabusOutlineItem[], parentId: string): number {
  return items.filter((item) => item.parentId === parentId).length;
}
