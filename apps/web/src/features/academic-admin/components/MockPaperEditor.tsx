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

  const toggleQuestionSelection = (questionId: string) => {
    const nextQuestions = [...mock.questions];
    const existingIndex = nextQuestions.findIndex((q) => q.questionId === questionId);

    if (existingIndex >= 0) {
      nextQuestions.splice(existingIndex, 1);
    } else {
      if (nextQuestions.length >= 48) return;
      nextQuestions.push({ questionId, points: 2 });
    }

    const updatedMock: MockPaper = {
      ...mock,
      questions: nextQuestions,
    };
    onChange([updatedMock]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div
        style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-block-sky)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ margin: '0 0 var(--space-xs)', fontSize: '1.2rem', fontWeight: 700 }}>
          {mock.title || t('admin.academic.mock.title')}
        </h3>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            fontSize: '0.9rem',
            color: 'var(--color-ink-muted)',
          }}
        >
          <span style={{ fontWeight: 650 }}>{t('admin.academic.mock.duration')}</span>
          <span>·</span>
          <span style={{ fontWeight: 650 }}>{t('admin.academic.mock.points')}</span>
          <span>·</span>
          <span style={{ fontWeight: 650 }}>{t('admin.academic.mock.questionCount')}</span>
        </div>

        <div style={{ marginTop: 'var(--space-md)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              fontWeight: 650,
              marginBottom: 'var(--space-xxs)',
            }}
          >
            <span>
              {t('admin.academic.mock.selectQuestions', { count: selectedQuestionIds.length })}
            </span>
            <span>{selectedQuestionIds.length} / 48</span>
          </div>
          <div
            className="progress-track"
            style={{
              width: '100%',
              height: '8px',
              background: 'var(--color-canvas)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
            }}
          >
            <div
              className="progress-value"
              style={{
                width: `${Math.min(100, (selectedQuestionIds.length / 48) * 100)}%`,
                height: '100%',
                background:
                  selectedQuestionIds.length === 48
                    ? 'var(--color-success)'
                    : 'var(--color-primary)',
                transition: 'width var(--motion-standard) var(--ease-standard)',
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: '1rem', fontWeight: 700 }}>
          Available Package Questions ({availableQuestions.length})
        </h4>

        {availableQuestions.length === 0 ? (
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem' }}>
            No questions created yet. Please create single-answer questions in the Questions tab
            first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {availableQuestions.map((q, idx) => {
              const isSelected = selectedQuestionIds.includes(q.id);
              const textBlock = q.stem.find((b): b is TextContentBlock => b.kind === 'TEXT');
              const mathBlock = q.stem.find((b): b is MathContentBlock => b.kind === 'MATH');
              const preview = textBlock?.text || mathBlock?.latex || `Question ${idx + 1}`;

              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? '2px solid var(--color-focus)'
                      : '1px solid var(--color-border)',
                    background: isSelected ? 'var(--color-surface-soft)' : 'var(--color-canvas)',
                    transition: 'all var(--motion-instant) var(--ease-standard)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginRight: 'var(--space-xs)',
                      }}
                    >
                      Q{idx + 1}
                    </span>
                    <span style={{ fontSize: '0.9rem' }}>{preview}</span>
                    <span
                      className="yukcsca-tag"
                      style={{ marginLeft: 'var(--space-xs)', fontSize: '0.65rem' }}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={isSelected ? 'btn-secondary' : 'btn-primary'}
                    style={{ minHeight: '34px', padding: '4px 12px', fontSize: '0.8rem' }}
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
