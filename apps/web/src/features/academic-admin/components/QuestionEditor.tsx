import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentBlockEditor } from './ContentBlockEditor';
import { AdminRemoveButton } from './AdminRemoveButton';
import type {
  LearningObjective,
  Question,
  SyllabusOutlineItem,
  ContentBlock,
  TextContentBlock,
  MathContentBlock,
} from '../types';

interface QuestionEditorProps {
  questions: Question[];
  outlineItems: SyllabusOutlineItem[];
  objectives: LearningObjective[];
  onChange: (updated: Question[]) => void;
}

export function QuestionEditor({
  questions,
  outlineItems,
  objectives,
  onChange,
}: QuestionEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(questions[0]?.id || null);

  const selectedQuestion = questions.find((q) => q.id === selectedId) || questions[0];

  const handleAddQuestion = () => {
    const newQuestion: Question = {
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
    onChange([...questions, newQuestion]);
    setSelectedId(newQuestion.id);
  };

  const handleUpdateQuestion = (updated: Question) => {
    onChange(questions.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) return;
    const filtered = questions.filter((q) => q.id !== id);
    onChange(filtered);
    if (selectedId === id) setSelectedId(filtered[0]?.id || null);
  };

  const toggleId = (ids: string[], id: string, checked: boolean): string[] => {
    if (checked) return ids.includes(id) ? ids : [...ids, id];
    return ids.filter((value) => value !== id);
  };

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.questions.title')} ({questions.length})
          </h3>
          <button
            type="button"
            className="btn-secondary admin-btn-compact"
            onClick={handleAddQuestion}
          >
            + {t('admin.academic.questions.addQuestion')}
          </button>
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
            {questions.length > 1 && (
              <AdminRemoveButton
                label={t('admin.academic.questions.delete')}
                onClick={() => handleDeleteQuestion(selectedQuestion.id)}
              />
            )}
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

          <fieldset className="admin-fieldset">
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

          <fieldset className="admin-fieldset">
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
            <ContentBlockEditor
              blocks={selectedQuestion.explanations[0]?.blocks || []}
              onChange={(updatedBlocks) =>
                handleUpdateQuestion({
                  ...selectedQuestion,
                  explanations: [
                    {
                      language: selectedQuestion.explanations[0]?.language || 'en',
                      blocks: updatedBlocks,
                    },
                  ],
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
