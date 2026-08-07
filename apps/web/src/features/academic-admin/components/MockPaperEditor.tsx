import type { CSSProperties } from 'react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MOCK_QUESTION_CAPACITY,
  buildMockQuestionSlots,
  ensureSingleMockShell,
  filterMockSelectionForLanguage,
  questionsMatchingExamLanguage,
  sumMockPoints,
} from '../mockDraft';
import {
  toDraftProvenanceInput,
  toEditableProvenance,
  type EditableProvenance,
} from '../provenanceDraft';
import { ProvenanceEditor } from './ProvenanceEditor';
import type {
  ExamLanguage,
  MockPaper,
  Question,
  TextContentBlock,
  MathContentBlock,
} from '../types';

interface MockPaperEditorProps {
  mocks: MockPaper[];
  availableQuestions: Question[];
  onChange: (updated: MockPaper[]) => void;
  disabled?: boolean;
}

function difficultyLabel(t: (key: string) => string, difficulty: Question['difficulty']): string {
  switch (difficulty) {
    case 'FOUNDATION':
      return t('admin.academic.questions.difficultyFoundation');
    case 'ADVANCED':
      return t('admin.academic.questions.difficultyAdvanced');
    case 'STANDARD':
    default:
      return t('admin.academic.questions.difficultyStandard');
  }
}

export function MockPaperEditor({
  mocks,
  availableQuestions,
  onChange,
  disabled = false,
}: MockPaperEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const selectAllId = useId();
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Always work against a single mock shell; parent should seed empty drafts too.
  const mock = ensureSingleMockShell(mocks)[0]!;
  const examLanguage = (mock.examLanguage || 'en') as ExamLanguage;

  const compatibleQuestions = questionsMatchingExamLanguage(availableQuestions, examLanguage);
  const selectedQuestionIds = mock.questions.map((q) => q.questionId);
  const selectedIdSet = new Set(selectedQuestionIds);
  const selectedPoints = sumMockPoints(mock.questions);
  const progressPct = Math.min(100, (selectedQuestionIds.length / MOCK_QUESTION_CAPACITY) * 100);
  const isFull = selectedQuestionIds.length >= MOCK_QUESTION_CAPACITY;

  const bulkTargetIds = compatibleQuestions.slice(0, MOCK_QUESTION_CAPACITY).map((q) => q.id);
  const selectableCount = bulkTargetIds.length;
  const masterChecked =
    selectableCount > 0 &&
    selectedQuestionIds.length === selectableCount &&
    bulkTargetIds.every((id) => selectedIdSet.has(id));
  const masterIndeterminate = selectedQuestionIds.length > 0 && !masterChecked;

  const incompatibleSelectedCount = selectedQuestionIds.filter(
    (id) => !compatibleQuestions.some((q) => q.id === id),
  ).length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = masterIndeterminate;
    }
  }, [masterIndeterminate]);

  const updateMock = (patch: Partial<MockPaper>) => {
    // Always persist a one-item mocks array so empty drafts get a real shell on first edit.
    onChange([{ ...mock, ...patch }]);
  };

  const commitSelection = (questionIds: readonly string[]) => {
    updateMock({ questions: buildMockQuestionSlots(questionIds) });
  };

  const handleExamLanguageChange = (nextLanguage: ExamLanguage) => {
    const pruned = filterMockSelectionForLanguage(
      selectedQuestionIds,
      availableQuestions,
      nextLanguage,
    );
    updateMock({
      examLanguage: nextLanguage,
      questions: buildMockQuestionSlots(pruned),
    });
  };

  const toggleQuestionSelection = (questionId: string, nextChecked: boolean) => {
    if (disabled) return;
    if (nextChecked) {
      if (selectedIdSet.has(questionId) || isFull) return;
      const question = availableQuestions.find((q) => q.id === questionId);
      if (!question || (question.examLanguage || 'en') !== examLanguage) return;
      commitSelection([...selectedQuestionIds, questionId]);
      return;
    }
    commitSelection(selectedQuestionIds.filter((id) => id !== questionId));
  };

  const handleMasterChange = (checked: boolean) => {
    if (disabled) return;
    commitSelection(checked ? bulkTargetIds : []);
  };

  const provenance = toEditableProvenance(mock.provenance);
  const setProvenance = (next: EditableProvenance) => {
    updateMock({
      provenance: {
        ...mock.provenance,
        ...toDraftProvenanceInput(next),
        authorUserId: mock.provenance.authorUserId,
        reviewedByUserId: mock.provenance.reviewedByUserId ?? null,
        reviewedAt: mock.provenance.reviewedAt ?? null,
      },
    });
  };

  return (
    <div className="admin-stack-lg">
      <div className="admin-mock-summary">
        <div className="admin-mock-title-field">
          <label htmlFor="mock-title" className="admin-field-label">
            {t('admin.academic.mock.titleLabel')} <span className="admin-required">*</span>
          </label>
          <input
            id="mock-title"
            type="text"
            className="text-input admin-field-control"
            value={mock.title ?? ''}
            maxLength={200}
            disabled={disabled}
            placeholder={t('admin.academic.mock.titlePlaceholder')}
            onChange={(e) => updateMock({ title: e.target.value })}
          />
          <p className="admin-hint">{t('admin.academic.mock.titleHint')}</p>
        </div>

        <div>
          <label htmlFor="mock-exam-language" className="admin-field-label">
            {t('admin.academic.mock.examLanguage')} <span className="admin-required">*</span>
          </label>
          <select
            id="mock-exam-language"
            className="text-input admin-field-control"
            value={examLanguage}
            disabled={disabled}
            onChange={(e) => handleExamLanguageChange(e.target.value as ExamLanguage)}
          >
            <option value="en">{t('admin.academic.questions.examLangEn')}</option>
            <option value="zh-CN">{t('admin.academic.questions.examLangZh')}</option>
          </select>
          <p className="admin-hint">{t('admin.academic.mock.examLanguageHint')}</p>
        </div>

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
              {selectedQuestionIds.length} / {MOCK_QUESTION_CAPACITY} · {selectedPoints} / 100 pts
            </span>
          </div>
          <div className="admin-mock-progress-track">
            <div
              className={`admin-mock-progress-fill${selectedQuestionIds.length === MOCK_QUESTION_CAPACITY ? ' admin-mock-progress-fill-complete' : ''}`}
              style={{ '--admin-progress': `${progressPct}%` } as CSSProperties}
            />
          </div>
          {selectedQuestionIds.length === MOCK_QUESTION_CAPACITY ? (
            <p className="admin-hint">{t('admin.academic.mock.pointsAutoHint')}</p>
          ) : (
            <p className="admin-hint">{t('admin.academic.mock.pointsPartialHint')}</p>
          )}
        </div>
      </div>

      <ProvenanceEditor
        idPrefix="mock-prov"
        value={provenance}
        onChange={setProvenance}
        disabled={disabled}
      />

      <div>
        <div className="admin-mock-list-toolbar">
          {compatibleQuestions.length > 0 ? (
            <label className="admin-mock-master-check" htmlFor={selectAllId}>
              <input
                ref={selectAllRef}
                id={selectAllId}
                type="checkbox"
                className="admin-mock-checkbox"
                checked={masterChecked}
                disabled={disabled}
                onChange={(e) => handleMasterChange(e.target.checked)}
                aria-label={t('admin.academic.mock.selectAllAria', {
                  count: selectableCount,
                })}
                title={t('admin.academic.mock.selectAllAria', {
                  count: selectableCount,
                })}
              />
              <h4 className="admin-section-title-lg admin-mock-list-title">
                {t('admin.academic.mock.availableQuestionsCompatible', {
                  count: compatibleQuestions.length,
                  language: examLanguage,
                  total: availableQuestions.length,
                })}
              </h4>
            </label>
          ) : (
            <h4 className="admin-section-title-lg">
              {t('admin.academic.mock.availableQuestionsCompatible', {
                count: 0,
                language: examLanguage,
                total: availableQuestions.length,
              })}
            </h4>
          )}
        </div>

        {availableQuestions.length === 0 ? (
          <p className="admin-muted">{t('admin.academic.mock.noQuestionsYet')}</p>
        ) : compatibleQuestions.length === 0 ? (
          <p className="admin-muted" role="status">
            {t('admin.academic.mock.noCompatibleQuestions', { language: examLanguage })}
          </p>
        ) : (
          <div
            className="admin-stack-xs"
            role="group"
            aria-label={t('admin.academic.mock.listAria')}
          >
            {compatibleQuestions.map((q, idx) => {
              const isSelected = selectedIdSet.has(q.id);
              const atCapacityBlocked = isFull && !isSelected;
              const textBlock = q.stem.find((b): b is TextContentBlock => b.kind === 'TEXT');
              const mathBlock = q.stem.find((b): b is MathContentBlock => b.kind === 'MATH');
              const preview =
                textBlock?.text ||
                mathBlock?.latex ||
                t('admin.academic.questions.untitled', { index: idx + 1 });
              const checkboxId = `mock-q-${q.id}`;

              return (
                <label
                  key={q.id}
                  htmlFor={checkboxId}
                  className={`admin-mock-question-row${isSelected ? ' admin-mock-question-row-selected' : ''}${atCapacityBlocked || disabled ? ' admin-mock-question-row-disabled' : ''}`}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="admin-mock-checkbox"
                    checked={isSelected}
                    disabled={atCapacityBlocked || disabled}
                    onChange={(e) => toggleQuestionSelection(q.id, e.target.checked)}
                    aria-label={t('admin.academic.mock.toggleQuestionAria', {
                      index: idx + 1,
                      preview,
                    })}
                  />
                  <span className="admin-mock-question-body">
                    <span className="admin-mock-question-index">Q{idx + 1}</span>
                    <span className="admin-mock-question-preview">{preview}</span>
                    <span className="yukcsca-tag admin-tag-inline">
                      {difficultyLabel(t, q.difficulty)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {incompatibleSelectedCount > 0 ? (
          <p className="admin-field-error" role="status">
            {t('admin.academic.mock.incompatibleSelected', { count: incompatibleSelectedCount })}
          </p>
        ) : null}

        {isFull && compatibleQuestions.length > MOCK_QUESTION_CAPACITY ? (
          <p className="admin-hint admin-mock-capacity-hint">
            {t('admin.academic.mock.capacityHint', { capacity: MOCK_QUESTION_CAPACITY })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
