import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectionAfterDeleteId } from '../listSelection';
import { AdminRemoveButton } from './AdminRemoveButton';
import type { LearningObjective, SyllabusOutlineItem } from '../types';

interface LearningObjectivesEditorProps {
  objectives: LearningObjective[];
  outlineItems: SyllabusOutlineItem[];
  onChange: (updated: LearningObjective[]) => void;
}

function emptyLocalized() {
  return { indonesian: '', english: '', simplifiedChinese: '' };
}

export function LearningObjectivesEditor({
  objectives,
  outlineItems,
  onChange,
}: LearningObjectivesEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(objectives[0]?.id || null);
  const selected = objectives.find((item) => item.id === selectedId) || objectives[0];

  const update = (next: LearningObjective) => {
    onChange(objectives.map((item) => (item.id === next.id ? next : item)));
  };

  const handleAdd = () => {
    const firstOutline = outlineItems[0];
    const created: LearningObjective = {
      id: crypto.randomUUID(),
      title: emptyLocalized(),
      mappings: firstOutline ? [{ outlineItemId: firstOutline.id, rationale: '' }] : [],
    };
    onChange([...objectives, created]);
    setSelectedId(created.id);
  };

  const handleDelete = (id: string) => {
    const nextSelectedId = selectionAfterDeleteId(
      objectives.map((item) => item.id),
      id,
    );
    const next = objectives.filter((item) => item.id !== id);
    onChange(next);
    if (selectedId === id || selected?.id === id) {
      setSelectedId(nextSelectedId);
    }
  };

  const outlineLabel = (id: string) => {
    const item = outlineItems.find((entry) => entry.id === id);
    if (!item) return id;
    return (
      item.summary.english ||
      item.summary.indonesian ||
      item.summary.simplifiedChinese ||
      item.sourcePosition?.section ||
      id
    );
  };

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.objectives.title')} ({objectives.length})
          </h3>
          <button type="button" className="btn-secondary admin-btn-compact" onClick={handleAdd}>
            + {t('admin.academic.objectives.addObjective')}
          </button>
        </div>

        {objectives.length === 0 ? (
          <p className="admin-muted">{t('admin.academic.objectives.empty')}</p>
        ) : (
          <div className="admin-stack-tight">
            {objectives.map((item, index) => {
              const label =
                item.title.english ||
                item.title.indonesian ||
                item.title.simplifiedChinese ||
                t('admin.academic.objectives.untitled', { index: index + 1 });
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`outline-tree-item admin-list-button-bare ${item.id === selected?.id ? 'outline-tree-item-selected' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected ? (
        <div className="admin-stack-md">
          <div className="admin-row-between">
            <h3 className="admin-detail-title">{t('admin.academic.objectives.editTitle')}</h3>
            <AdminRemoveButton
              label={t('admin.academic.objectives.remove')}
              onClick={() => handleDelete(selected.id)}
            />
          </div>

          {(
            [
              ['indonesian', t('admin.academic.outline.summaryId')],
              ['english', t('admin.academic.outline.summaryEn')],
              ['simplifiedChinese', t('admin.academic.outline.summaryZh')],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label htmlFor={`objective-title-${field}`} className="admin-field-label">
                {label} <span className="admin-required">*</span>
              </label>
              <textarea
                id={`objective-title-${field}`}
                className="text-input admin-field-control-resize"
                rows={2}
                value={selected.title[field] || ''}
                onChange={(e) =>
                  update({
                    ...selected,
                    title: { ...selected.title, [field]: e.target.value },
                  })
                }
              />
            </div>
          ))}

          <div>
            <div className="admin-row-between admin-split-sidebar-header">
              <h4 className="admin-section-title">{t('admin.academic.objectives.mappings')}</h4>
              <button
                type="button"
                className="btn-secondary admin-btn-compact"
                disabled={outlineItems.length === 0}
                onClick={() =>
                  update({
                    ...selected,
                    mappings: [
                      ...selected.mappings,
                      {
                        outlineItemId: outlineItems[0]?.id || '',
                        rationale: '',
                      },
                    ],
                  })
                }
              >
                + {t('admin.academic.objectives.addMapping')}
              </button>
            </div>

            {outlineItems.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.objectives.needOutline')}</p>
            ) : null}

            {selected.mappings.map((mapping, index) => (
              <div key={`${mapping.outlineItemId}-${index}`} className="admin-mapping-card">
                <div>
                  <label
                    htmlFor={`objective-mapping-outline-${index}`}
                    className="admin-field-label"
                  >
                    {t('admin.academic.objectives.outlineItem')}
                  </label>
                  <select
                    id={`objective-mapping-outline-${index}`}
                    className="text-input admin-field-control"
                    value={mapping.outlineItemId}
                    onChange={(e) => {
                      const mappings = [...selected.mappings];
                      mappings[index] = { ...mapping, outlineItemId: e.target.value };
                      update({ ...selected, mappings });
                    }}
                  >
                    {outlineItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {outlineLabel(item.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`objective-mapping-rationale-${index}`}
                    className="admin-field-label"
                  >
                    {t('admin.academic.objectives.rationale')}
                  </label>
                  <input
                    id={`objective-mapping-rationale-${index}`}
                    type="text"
                    className="text-input admin-field-control"
                    value={mapping.rationale || ''}
                    onChange={(e) => {
                      const mappings = [...selected.mappings];
                      mappings[index] = { ...mapping, rationale: e.target.value };
                      update({ ...selected, mappings });
                    }}
                  />
                </div>
                {selected.mappings.length > 1 ? (
                  <AdminRemoveButton
                    label={t('admin.academic.objectives.removeMapping')}
                    onClick={() =>
                      update({
                        ...selected,
                        mappings: selected.mappings.filter((_, i) => i !== index),
                      })
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
