import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { MockPaper, Question, TextContentBlock, MathContentBlock } from '../types';

interface MockPaperEditorProps {
  mocks: MockPaper[];
  availableQuestions: Question[];
  onChange: (updated: MockPaper[]) => void;
}

export function MockPaperEditor({
  mocks,
  availableQuestions,
  onChange,
}: MockPaperEditorProps): React.JSX.Element {
  const { t } = useTranslation();

  const mock = mocks[0] || {
    id: crypto.randomUUID(),
    title: '2025 CSCA Mathematics Full-Length Mock 1',
    examLanguage: 'en',
    durationMinutes: 60,
    totalPoints: 100,
    questionCount: 48,
    questionType: 'SINGLE_ANSWER',
    questions: [],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: '00000000-0000-0000-0000-000000000001',
      reviewedAt: new Date().toISOString(),
    },
  };

  const selectedQuestionIds = mock.questions.map((q) => q.questionId);
  const selectedPoints = mock.questions.reduce((sum, item) => sum + item.points, 0);
  const progressPct = Math.min(100, (selectedQuestionIds.length / 48) * 100);

  const toggleQuestionSelection = (questionId: string) => {
    const nextQuestions = [...mock.questions];
    const existingIndex = nextQuestions.findIndex((q) => q.questionId === questionId);

    if (existingIndex >= 0) {
      nextQuestions.splice(existingIndex, 1);
    } else {
      if (nextQuestions.length >= 48) return;
      nextQuestions.push({ questionId, points: 2 });
    }

    const rebalanced =
      nextQuestions.length === 48
        ? nextQuestions.map((item, index) => ({
            questionId: item.questionId,
            points: index < 4 ? 3 : 2,
          }))
        : nextQuestions.map((item) => ({ questionId: item.questionId, points: 2 }));

    const updatedMock: MockPaper = {
      ...mock,
      questions: rebalanced,
    };
    onChange([updatedMock]);
  };

  return (
    <div className="admin-stack-lg">
      <div className="admin-mock-summary">
        <h3 className="admin-mock-title">{mock.title || t('admin.academic.mock.title')}</h3>

        <div className="admin-mock-meta">
          <span className="admin-mock-meta-item">{t('admin.academic.mock.duration')}</span>
          <span>·</span>
          <span className="admin-mock-meta-item">{t('admin.academic.mock.points')}</span>
          <span>·</span>
          <span className="admin-mock-meta-item">{t('admin.academic.mock.questionCount')}</span>
        </div>

        <div className="admin-mock-progress">
          <div className="admin-mock-progress-header">
            <span>
              {t('admin.academic.mock.selectQuestions', { count: selectedQuestionIds.length })}
            </span>
            <span>
              {selectedQuestionIds.length} / 48 · {selectedPoints} / 100 pts
            </span>
          </div>
          <div className="admin-mock-progress-track">
            <div
              className={`admin-mock-progress-fill${selectedQuestionIds.length === 48 ? ' admin-mock-progress-fill-complete' : ''}`}
              style={{ '--admin-progress': `${progressPct}%` } as CSSProperties}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="admin-section-title-lg">
          Available Package Questions ({availableQuestions.length})
        </h4>

        {availableQuestions.length === 0 ? (
          <p className="admin-muted">
            No questions created yet. Please create single-answer questions in the Questions tab
            first.
          </p>
        ) : (
          <div className="admin-stack-xs">
            {availableQuestions.map((q, idx) => {
              const isSelected = selectedQuestionIds.includes(q.id);
              const textBlock = q.stem.find((b): b is TextContentBlock => b.kind === 'TEXT');
              const mathBlock = q.stem.find((b): b is MathContentBlock => b.kind === 'MATH');
              const preview = textBlock?.text || mathBlock?.latex || `Question ${idx + 1}`;

              return (
                <div
                  key={q.id}
                  className={`admin-mock-question-row${isSelected ? ' admin-mock-question-row-selected' : ''}`}
                >
                  <div>
                    <span className="admin-mock-question-index">Q{idx + 1}</span>
                    <span className="admin-mock-question-preview">{preview}</span>
                    <span className="yukcsca-tag admin-tag-inline">{q.difficulty}</span>
                  </div>

                  <button
                    type="button"
                    className={`${isSelected ? 'btn-secondary' : 'btn-primary'} admin-btn-compact-md`}
                    onClick={() => toggleQuestionSelection(q.id)}
                  >
                    {isSelected ? 'Deselect' : 'Select for Mock'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
