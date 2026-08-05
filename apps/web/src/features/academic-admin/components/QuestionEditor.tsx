import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentBlockEditor } from './ContentBlockEditor';
import type {
  Question,
  SyllabusOutlineItem,
  ContentBlock,
  TextContentBlock,
  MathContentBlock,
} from '../types';

interface QuestionEditorProps {
  questions: Question[];
  outlineItems: SyllabusOutlineItem[];
  onChange: (updated: Question[]) => void;
}

export function QuestionEditor({
  questions,
  outlineItems,
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
      objectiveIds: [],
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        authorUserId: '00000000-0000-0000-0000-000000000001',
        reviewedByUserId: '00000000-0000-0000-0000-000000000001',
        reviewedAt: new Date().toISOString(),
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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr',
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
            {t('admin.academic.questions.title')} ({questions.length})
          </h3>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={handleAddQuestion}
          >
            + {t('admin.academic.questions.addQuestion')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {questions.map((q, idx) => {
            const isSelected = q.id === selectedQuestion?.id;
            const textBlock = q.stem.find((b): b is TextContentBlock => b.kind === 'TEXT');
            const mathBlock = q.stem.find((b): b is MathContentBlock => b.kind === 'MATH');
            const textPreview = textBlock?.text || mathBlock?.latex || `Question ${idx + 1}`;

            return (
              <button
                key={q.id}
                type="button"
                className={`outline-tree-item ${isSelected ? 'outline-tree-item-selected' : ''}`}
                onClick={() => setSelectedId(q.id)}
                style={{
                  textAlign: 'left',
                  border: 0,
                  width: '100%',
                  padding: 'var(--space-xs) var(--space-sm)',
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, marginRight: '6px' }}>
                    Q{idx + 1}
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>{textPreview}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Detail */}
      {selectedQuestion ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Edit Question ({selectedQuestion.examLanguage || 'en'})
            </h3>
            {questions.length > 1 && (
              <button
                type="button"
                className="btn-danger"
                style={{ minHeight: '32px', padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={() => handleDeleteQuestion(selectedQuestion.id)}
              >
                Delete Question
              </button>
            )}
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}
          >
            <div>
              <label htmlFor="q-lang" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                Exam Language
              </label>
              <select
                id="q-lang"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
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
              <label htmlFor="q-diff" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                Difficulty
              </label>
              <select
                id="q-diff"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
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
              <label htmlFor="q-correct" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
                {t('admin.academic.questions.correctOption')}
              </label>
              <select
                id="q-correct"
                className="text-input"
                style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
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
                    Option {opt.key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stem */}
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

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              {t('admin.academic.questions.options')}
            </h4>

            {selectedQuestion.options.map(
              (opt: { key: string; blocks: ContentBlock[] }, optIndex: number) => (
                <div
                  key={opt.key}
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedQuestion.correctOptionKey === opt.key
                        ? '2px solid var(--color-success)'
                        : '1px solid var(--color-border)',
                    background:
                      selectedQuestion.correctOptionKey === opt.key
                        ? 'var(--color-block-mint)'
                        : 'var(--color-canvas)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Option {opt.key}{' '}
                      {selectedQuestion.correctOptionKey === opt.key ? '✓ (Correct)' : ''}
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

          {/* Explanations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              {t('admin.academic.questions.explanations')}
            </h4>
            <ContentBlockEditor
              blocks={selectedQuestion.explanations[0]?.blocks || []}
              onChange={(updatedBlocks) =>
                handleUpdateQuestion({
                  ...selectedQuestion,
                  explanations: [{ language: 'en', blocks: updatedBlocks }],
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
