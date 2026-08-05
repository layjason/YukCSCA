import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentBlockEditor } from './ContentBlockEditor';
import { AdminRemoveButton } from './AdminRemoveButton';
import type { LearningObjective, StudyResource, SyllabusOutlineItem } from '../types';

interface StudyResourcesEditorProps {
  resources: StudyResource[];
  outlineItems: SyllabusOutlineItem[];
  objectives: LearningObjective[];
  onChange: (updated: StudyResource[]) => void;
}

const RESOURCE_KINDS = ['LESSON', 'TERMINOLOGY', 'REMEDIATION'] as const;

function emptyLocalized() {
  return { indonesian: '', english: '', simplifiedChinese: '' };
}

function kindLabel(
  t: (key: string) => string,
  kind: (typeof RESOURCE_KINDS)[number] | undefined,
): string {
  switch (kind) {
    case 'LESSON':
      return t('admin.academic.resources.kindLesson');
    case 'TERMINOLOGY':
      return t('admin.academic.resources.kindTerminology');
    case 'REMEDIATION':
      return t('admin.academic.resources.kindRemediation');
    default:
      return t('admin.academic.resources.kindUnset');
  }
}

export function StudyResourcesEditor({
  resources,
  outlineItems,
  objectives,
  onChange,
}: StudyResourcesEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(resources[0]?.id || null);
  const selected = resources.find((item) => item.id === selectedId) || resources[0];

  const update = (next: StudyResource) => {
    onChange(resources.map((item) => (item.id === next.id ? next : item)));
  };

  const handleAdd = (kind: (typeof RESOURCE_KINDS)[number]) => {
    const created: StudyResource = {
      id: crypto.randomUUID(),
      kind,
      title: emptyLocalized(),
      outlineItemIds: outlineItems[0] ? [outlineItems[0].id] : [],
      objectiveIds: objectives[0] ? [objectives[0].id] : [],
      versions: [
        {
          language: 'en',
          blocks: [{ kind: 'TEXT', text: '' }],
        },
      ],
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        authorUserId: '00000000-0000-0000-0000-000000000001',
        reviewedByUserId: null,
        reviewedAt: null,
      },
    };
    onChange([...resources, created]);
    setSelectedId(created.id);
  };

  const handleDelete = (id: string) => {
    if (resources.length <= 1) return;
    const next = resources.filter((item) => item.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const toggleId = (ids: string[], id: string, checked: boolean): string[] => {
    if (checked) return ids.includes(id) ? ids : [...ids, id];
    return ids.filter((value) => value !== id);
  };

  const presentKinds = new Set(resources.map((item) => item.kind).filter(Boolean));

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header admin-stack-sm">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.resources.title')} ({resources.length})
          </h3>
          <p className="admin-hint">{t('admin.academic.resources.requiredKindsHint')}</p>
          <div className="admin-stack-xs">
            {RESOURCE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="btn-secondary admin-btn-compact"
                onClick={() => handleAdd(kind)}
              >
                + {kindLabel(t, kind)}
                {presentKinds.has(kind) ? '' : ` (${t('admin.academic.resources.missing')})`}
              </button>
            ))}
          </div>
        </div>

        {resources.length === 0 ? (
          <p className="admin-muted">{t('admin.academic.resources.empty')}</p>
        ) : (
          <div className="admin-stack-tight">
            {resources.map((item, index) => {
              const label =
                item.title.english ||
                item.title.indonesian ||
                item.title.simplifiedChinese ||
                t('admin.academic.resources.untitled', { index: index + 1 });
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`outline-tree-item admin-list-button-bare ${item.id === selected?.id ? 'outline-tree-item-selected' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="yukcsca-tag admin-tag-compact">{kindLabel(t, item.kind)}</span>
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
            <h3 className="admin-detail-title">{t('admin.academic.resources.editTitle')}</h3>
            {resources.length > 1 ? (
              <AdminRemoveButton
                label={t('admin.academic.resources.remove')}
                onClick={() => handleDelete(selected.id)}
              />
            ) : null}
          </div>

          <div>
            <label htmlFor="resource-kind" className="admin-field-label">
              {t('admin.academic.resources.kind')}
            </label>
            <select
              id="resource-kind"
              className="text-input admin-field-control"
              value={selected.kind || 'LESSON'}
              onChange={(e) =>
                update({
                  ...selected,
                  kind: e.target.value as (typeof RESOURCE_KINDS)[number],
                })
              }
            >
              {RESOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kindLabel(t, kind)}
                </option>
              ))}
            </select>
          </div>

          {(
            [
              ['indonesian', t('admin.academic.outline.summaryId')],
              ['english', t('admin.academic.outline.summaryEn')],
              ['simplifiedChinese', t('admin.academic.outline.summaryZh')],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label htmlFor={`resource-title-${field}`} className="admin-field-label">
                {label} <span className="admin-required">*</span>
              </label>
              <input
                id={`resource-title-${field}`}
                type="text"
                className="text-input admin-field-control"
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

          <fieldset className="admin-fieldset">
            <legend className="admin-fieldset-legend">
              {t('admin.academic.resources.outlineRefs')}
            </legend>
            {outlineItems.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.objectives.needOutline')}</p>
            ) : (
              <div className="admin-check-list">
                {outlineItems.map((item) => {
                  const label =
                    item.summary.english ||
                    item.summary.indonesian ||
                    item.summary.simplifiedChinese ||
                    item.id;
                  return (
                    <label key={item.id} className="admin-check-row">
                      <input
                        type="checkbox"
                        checked={selected.outlineItemIds.includes(item.id)}
                        onChange={(e) =>
                          update({
                            ...selected,
                            outlineItemIds: toggleId(
                              selected.outlineItemIds,
                              item.id,
                              e.target.checked,
                            ),
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend className="admin-fieldset-legend">
              {t('admin.academic.resources.objectiveRefs')}
            </legend>
            {objectives.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.resources.needObjectives')}</p>
            ) : (
              <div className="admin-check-list">
                {objectives.map((item) => {
                  const label =
                    item.title.english ||
                    item.title.indonesian ||
                    item.title.simplifiedChinese ||
                    item.id;
                  return (
                    <label key={item.id} className="admin-check-row">
                      <input
                        type="checkbox"
                        checked={selected.objectiveIds.includes(item.id)}
                        onChange={(e) =>
                          update({
                            ...selected,
                            objectiveIds: toggleId(
                              selected.objectiveIds,
                              item.id,
                              e.target.checked,
                            ),
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <ContentBlockEditor
            label={t('admin.academic.resources.content')}
            blocks={selected.versions[0]?.blocks || []}
            onChange={(blocks) =>
              update({
                ...selected,
                versions: [{ language: selected.versions[0]?.language || 'en', blocks }],
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
