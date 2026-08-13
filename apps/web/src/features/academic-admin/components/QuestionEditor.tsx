import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectionAfterDeleteId } from '../listSelection';
import {
  toDraftProvenanceInput,
  toEditableProvenance,
  type EditableProvenance,
} from '../provenanceDraft';
import { ContentBlockEditor } from './ContentBlockEditor';
import { LocalizedVersionsEditor } from './LocalizedVersionsEditor';
import { ProvenanceEditor } from './ProvenanceEditor';
import { AdminRemoveButton } from './AdminRemoveButton';
import { useAdminNotify } from '../adminNotify';
import type {
  LearningObjective,
  Question,
  SyllabusOutlineItem,
  ContentBlock,
  TextContentBlock,
  MathContentBlock,
  StudyResource,
  HintTier,
} from '../types';

interface QuestionEditorProps {
  questions: Question[];
  outlineItems: SyllabusOutlineItem[];
  objectives: LearningObjective[];
  resources?: StudyResource[];
  onChange: (updated: Question[]) => void;
  disabled?: boolean;
}

function createEmptyQuestion(
  outlineItems: SyllabusOutlineItem[],
  objectives: LearningObjective[],
): Question {
  return {
    id: crypto.randomUUID(),
    examLanguage: 'en',
    difficulty: 'STANDARD',
    stem: [{ kind: 'TEXT', text: '' }],
    options: [
      { key: 'A', blocks: [{ kind: 'TEXT', text: '' }] },
      { key: 'B', blocks: [{ kind: 'TEXT', text: '' }] },
      { key: 'C', blocks: [{ kind: 'TEXT', text: '' }] },
      { key: 'D', blocks: [{ kind: 'TEXT', text: '' }] },
    ],
    correctOptionKey: 'A',
    explanations: [
      {
        language: 'en',
        blocks: [{ kind: 'TEXT', text: '' }],
      },
    ],
    outlineItemIds: outlineItems[0] ? [outlineItems[0].id] : [],
    objectiveIds: objectives[0] ? [objectives[0].id] : [],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: null,
      reviewedAt: null,
    },
  };
}

/** Deep-clone a question with a fresh id. Content and mappings stay intentional for volume authoring. */
function duplicateQuestion(source: Question): Question {
  const copy = structuredClone(source);
  copy.id = crypto.randomUUID();
  return copy;
}

export function QuestionEditor({
  questions,
  outlineItems,
  objectives,
  resources = [],
  onChange,
  disabled = false,
}: QuestionEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const notify = useAdminNotify();
  const [selectedId, setSelectedId] = useState<string | null>(questions[0]?.id || null);

  const selectedQuestion = questions.find((q) => q.id === selectedId) || questions[0];

  const handleAddQuestion = () => {
    if (disabled) return;
    const newQuestion = createEmptyQuestion(outlineItems, objectives);
    onChange([...questions, newQuestion]);
    setSelectedId(newQuestion.id);
    notify(
      t('admin.academic.toasts.added', { name: t('admin.academic.toasts.names.question') }),
      'success',
    );
  };

  const handleDuplicateQuestion = () => {
    if (!selectedQuestion || disabled) return;
    const clone = duplicateQuestion(selectedQuestion);
    const sourceIndex = questions.findIndex((q) => q.id === selectedQuestion.id);
    const next = [...questions];
    next.splice(sourceIndex >= 0 ? sourceIndex + 1 : next.length, 0, clone);
    onChange(next);
    setSelectedId(clone.id);
    notify(
      t('admin.academic.toasts.duplicated', { name: t('admin.academic.toasts.names.question') }),
      'info',
    );
  };

  const handleUpdateQuestion = (updated: Question) => {
    onChange(questions.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    if (disabled) return;
    // Allow emptying the list so drafts can be cleaned; publish still requires ≥48.
    const orderedIds = questions.map((q) => q.id);
    const nextSelectedId = selectionAfterDeleteId(orderedIds, id);
    const filtered = questions.filter((q) => q.id !== id);
    onChange(filtered);
    if (selectedId === id || selectedQuestion?.id === id) {
      setSelectedId(nextSelectedId);
    }
    notify(
      t('admin.academic.toasts.removed', { name: t('admin.academic.toasts.names.question') }),
      'error',
    );
  };

  const toggleId = (ids: string[], id: string, checked: boolean): string[] => {
    if (checked) return ids.includes(id) ? ids : [...ids, id];
    return ids.filter((value) => value !== id);
  };

  const setProvenance = (next: EditableProvenance) => {
    if (!selectedQuestion) return;
    handleUpdateQuestion({
      ...selectedQuestion,
      provenance: {
        ...selectedQuestion.provenance,
        ...toDraftProvenanceInput(next),
        authorUserId: selectedQuestion.provenance.authorUserId,
        reviewedByUserId: selectedQuestion.provenance.reviewedByUserId ?? null,
        reviewedAt: selectedQuestion.provenance.reviewedAt ?? null,
      },
    });
  };

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header admin-split-sidebar-header-stack">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.questions.title')} ({questions.length})
          </h3>
          <div className="admin-equal-actions" data-count="1">
            <button
              type="button"
              className="btn-secondary admin-btn-compact"
              onClick={handleAddQuestion}
              disabled={disabled}
            >
              + {t('admin.academic.questions.addQuestion')}
            </button>
          </div>
        </div>

        <div className="admin-stack-tight">
          {questions.map((q, idx) => {
            const isSelected = q.id === selectedQuestion?.id;
            const textBlock = q.stem.find((b): b is TextContentBlock => b.kind === 'TEXT');
            const mathBlock = q.stem.find((b): b is MathContentBlock => b.kind === 'MATH');
            const textPreview =
              textBlock?.text ||
              mathBlock?.latex ||
              t('admin.academic.questions.untitled', { index: idx + 1 });

            return (
              <button
                key={q.id}
                type="button"
                className={`outline-tree-item admin-list-button ${isSelected ? 'outline-tree-item-selected' : ''}`}
                onClick={() => setSelectedId(q.id)}
              >
                <div className="admin-ellipsis">
                  <span className="admin-list-index">Q{idx + 1}</span>
                  <span className="admin-list-preview">{textPreview}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedQuestion ? (
        <div className="admin-stack-lg">
          <div className="admin-row-between">
            <h3 className="admin-detail-title">
              {t('admin.academic.questions.editTitle', {
                language: selectedQuestion.examLanguage || 'en',
              })}
            </h3>
            <div className="admin-row-wrap">
              <button
                type="button"
                className="btn-secondary admin-btn-compact"
                onClick={handleDuplicateQuestion}
                disabled={disabled}
              >
                {t('admin.academic.questions.duplicate')}
              </button>
              <AdminRemoveButton
                label={t('admin.academic.questions.delete')}
                onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="admin-grid-3">
            <div>
              <label htmlFor="q-lang" className="admin-field-label">
                {t('admin.academic.questions.examLanguage')}
              </label>
              <select
                id="q-lang"
                className="text-input admin-field-control"
                value={selectedQuestion.examLanguage || 'en'}
                disabled={disabled}
                onChange={(e) =>
                  handleUpdateQuestion({
                    ...selectedQuestion,
                    examLanguage: e.target.value as 'en' | 'zh-CN',
                  })
                }
              >
                <option value="en">{t('admin.academic.questions.examLangEn')}</option>
                <option value="zh-CN">{t('admin.academic.questions.examLangZh')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="q-diff" className="admin-field-label">
                {t('admin.academic.questions.difficulty')}
              </label>
              <select
                id="q-diff"
                className="text-input admin-field-control"
                value={selectedQuestion.difficulty || 'STANDARD'}
                disabled={disabled}
                onChange={(e) =>
                  handleUpdateQuestion({
                    ...selectedQuestion,
                    difficulty: e.target.value as 'FOUNDATION' | 'STANDARD' | 'ADVANCED',
                  })
                }
              >
                <option value="FOUNDATION">
                  {t('admin.academic.questions.difficultyFoundation')}
                </option>
                <option value="STANDARD">{t('admin.academic.questions.difficultyStandard')}</option>
                <option value="ADVANCED">{t('admin.academic.questions.difficultyAdvanced')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="q-correct" className="admin-field-label">
                {t('admin.academic.questions.correctOption')}
              </label>
              <select
                id="q-correct"
                className="text-input admin-field-control"
                value={selectedQuestion.correctOptionKey || 'A'}
                disabled={disabled}
                onChange={(e) =>
                  handleUpdateQuestion({
                    ...selectedQuestion,
                    correctOptionKey: e.target.value,
                  })
                }
              >
                {selectedQuestion.options.map((opt: { key: string }) => (
                  <option key={opt.key} value={opt.key}>
                    {t('admin.academic.questions.optionLabel', { key: opt.key })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.questions.outlineRefs')}
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
                        checked={selectedQuestion.outlineItemIds.includes(item.id)}
                        onChange={(e) =>
                          handleUpdateQuestion({
                            ...selectedQuestion,
                            outlineItemIds: toggleId(
                              selectedQuestion.outlineItemIds,
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

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.questions.objectiveRefs')}
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
                        checked={selectedQuestion.objectiveIds.includes(item.id)}
                        onChange={(e) =>
                          handleUpdateQuestion({
                            ...selectedQuestion,
                            objectiveIds: toggleId(
                              selectedQuestion.objectiveIds,
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

          <ProvenanceEditor
            idPrefix={`q-prov-${selectedQuestion.id}`}
            value={toEditableProvenance(selectedQuestion.provenance)}
            onChange={setProvenance}
            disabled={disabled}
          />

          <ContentBlockEditor
            label={t('admin.academic.questions.stem')}
            blocks={selectedQuestion.stem}
            onChange={(updatedStem) =>
              handleUpdateQuestion({
                ...selectedQuestion,
                stem: updatedStem,
              })
            }
          />

          <div className="admin-stack-md">
            <h4 className="admin-section-title-lg">{t('admin.academic.questions.options')}</h4>

            {selectedQuestion.options.map(
              (opt: { key: string; blocks: ContentBlock[] }, optIndex: number) => (
                <div
                  key={opt.key}
                  className={
                    selectedQuestion.correctOptionKey === opt.key
                      ? 'admin-option-card admin-option-card-correct'
                      : 'admin-option-card'
                  }
                >
                  <div className="admin-option-header">
                    <span className="admin-option-title">
                      {t('admin.academic.questions.optionLabel', { key: opt.key })}
                      {selectedQuestion.correctOptionKey === opt.key
                        ? ` ${t('admin.academic.questions.correctMarker')}`
                        : ''}
                    </span>
                  </div>

                  <ContentBlockEditor
                    blocks={opt.blocks}
                    onChange={(updatedBlocks) => {
                      const nextOptions = [...selectedQuestion.options];
                      nextOptions[optIndex] = { ...opt, blocks: updatedBlocks };
                      handleUpdateQuestion({ ...selectedQuestion, options: nextOptions });
                    }}
                  />
                </div>
              ),
            )}
          </div>

          <div className="admin-stack-sm">
            <h4 className="admin-section-title-lg">{t('admin.academic.questions.explanations')}</h4>
            <LocalizedVersionsEditor
              versions={selectedQuestion.explanations ?? []}
              contentLabel={t('admin.academic.questions.explanationContent')}
              disabled={disabled}
              onChange={(explanations) =>
                handleUpdateQuestion({
                  ...selectedQuestion,
                  explanations,
                })
              }
            />
          </div>

          <div className="admin-stack-sm">
            <div className="admin-row-between">
              <h4 className="admin-section-title-lg">{t('admin.academic.questions.hints')}</h4>
              <button
                type="button"
                className="btn-secondary admin-btn-compact"
                disabled={disabled || (selectedQuestion.hintTiers?.length ?? 0) >= 8}
                onClick={() => {
                  const tiers: HintTier[] = [...(selectedQuestion.hintTiers ?? [])];
                  tiers.push({
                    strength: 'STANDARD',
                    blocks: [{ kind: 'TEXT', text: '' }],
                  });
                  handleUpdateQuestion({ ...selectedQuestion, hintTiers: tiers });
                  notify(
                    t('admin.academic.toasts.added', {
                      name: t('admin.academic.toasts.names.hint'),
                    }),
                    'success',
                  );
                }}
              >
                + {t('admin.academic.questions.addHint')}
              </button>
            </div>
            {(selectedQuestion.hintTiers ?? []).length === 0 ? (
              <p className="admin-muted">{t('admin.academic.questions.hintsEmpty')}</p>
            ) : (
              <div className="admin-hint-list">
                {(selectedQuestion.hintTiers ?? []).map((tier, tierIndex) => (
                  <div key={`hint-${selectedQuestion.id}-${tierIndex}`} className="admin-hint-card">
                    <div className="admin-hint-toolbar">
                      <label
                        className="admin-field-label admin-hint-strength-label"
                        htmlFor={`hint-strength-${tierIndex}`}
                      >
                        {t('admin.academic.questions.hintStrength')}
                      </label>
                      <select
                        id={`hint-strength-${tierIndex}`}
                        className="text-input admin-hint-strength"
                        value={tier.strength}
                        disabled={disabled}
                        onChange={(e) => {
                          const tiers = [...(selectedQuestion.hintTiers ?? [])];
                          tiers[tierIndex] = {
                            ...tier,
                            strength: e.target.value as HintTier['strength'],
                          };
                          handleUpdateQuestion({ ...selectedQuestion, hintTiers: tiers });
                        }}
                      >
                        <option value="STANDARD">
                          {t('admin.academic.questions.hintStandard')}
                        </option>
                        <option value="STRONG">{t('admin.academic.questions.hintStrong')}</option>
                      </select>
                      <AdminRemoveButton
                        label={t('admin.academic.questions.removeHint')}
                        disabled={disabled}
                        onClick={() => {
                          const tiers = (selectedQuestion.hintTiers ?? []).filter(
                            (_, i) => i !== tierIndex,
                          );
                          handleUpdateQuestion({
                            ...selectedQuestion,
                            hintTiers: tiers,
                          });
                          notify(
                            t('admin.academic.toasts.removed', {
                              name: t('admin.academic.toasts.names.hint'),
                            }),
                            'error',
                          );
                        }}
                      />
                    </div>
                    <ContentBlockEditor
                      compact
                      label={t('admin.academic.questions.hintContent')}
                      blocks={tier.blocks}
                      onChange={(blocks) => {
                        const tiers = [...(selectedQuestion.hintTiers ?? [])];
                        tiers[tierIndex] = { ...tier, blocks };
                        handleUpdateQuestion({ ...selectedQuestion, hintTiers: tiers });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.questions.relatedResources')}
            </legend>
            {resources.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.resources.needObjectives')}</p>
            ) : (
              <div className="admin-check-list">
                {resources
                  .filter((r) => r.kind === 'LESSON' || r.kind === 'REMEDIATION' || !r.kind)
                  .map((r) => {
                    const label =
                      r.title.english || r.title.indonesian || r.title.simplifiedChinese || r.id;
                    const selectedIds = selectedQuestion.relatedResourceIds ?? [];
                    return (
                      <label key={r.id} className="admin-check-row">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={(e) =>
                            handleUpdateQuestion({
                              ...selectedQuestion,
                              relatedResourceIds: toggleId(selectedIds, r.id, e.target.checked),
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

          <div className="admin-stack-sm">
            <h4 className="admin-section-title-lg">
              {t('admin.academic.questions.commonMistakeNotes')}
            </h4>
            {(() => {
              const note = selectedQuestion.commonMistakeNotes?.[0] ?? {
                english: '',
                indonesian: '',
                simplifiedChinese: '',
              };
              const setNote = (
                field: 'english' | 'indonesian' | 'simplifiedChinese',
                value: string,
              ) => {
                const next = { ...note, [field]: value };
                const empty =
                  !(next.english ?? '').trim() &&
                  !(next.indonesian ?? '').trim() &&
                  !(next.simplifiedChinese ?? '').trim();
                handleUpdateQuestion({
                  ...selectedQuestion,
                  commonMistakeNotes: empty ? [] : [next],
                });
              };
              return (
                <div className="admin-grid-3">
                  <div>
                    <label htmlFor="cm-en" className="admin-field-label">
                      {t('admin.academic.questions.commonMistakeEn')}
                    </label>
                    <textarea
                      id="cm-en"
                      className="text-input admin-field-control"
                      rows={2}
                      value={note.english ?? ''}
                      disabled={disabled}
                      onChange={(e) => setNote('english', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="cm-id" className="admin-field-label">
                      {t('admin.academic.questions.commonMistakeId')}
                    </label>
                    <textarea
                      id="cm-id"
                      className="text-input admin-field-control"
                      rows={2}
                      value={note.indonesian ?? ''}
                      disabled={disabled}
                      onChange={(e) => setNote('indonesian', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="cm-zh" className="admin-field-label">
                      {t('admin.academic.questions.commonMistakeZh')}
                    </label>
                    <textarea
                      id="cm-zh"
                      className="text-input admin-field-control"
                      rows={2}
                      value={note.simplifiedChinese ?? ''}
                      disabled={disabled}
                      onChange={(e) => setNote('simplifiedChinese', e.target.value)}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <p className="admin-muted">{t('admin.academic.questions.empty')}</p>
      )}
    </div>
  );
}
