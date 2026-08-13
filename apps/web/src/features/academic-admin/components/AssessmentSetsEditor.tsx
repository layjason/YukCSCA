import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectionAfterDeleteId } from '../listSelection';
import { AdminRemoveButton } from './AdminRemoveButton';
import { useAdminNotify } from '../adminNotify';
import type {
  AssessmentSet,
  ExamLanguage,
  LearningObjective,
  Question,
  QuestionDifficulty,
  StudyResource,
  SyllabusOutlineItem,
} from '../types';

interface AssessmentSetsEditorProps {
  assessmentSets: AssessmentSet[];
  questions: Question[];
  resources: StudyResource[];
  outlineItems: SyllabusOutlineItem[];
  objectives: LearningObjective[];
  onChange: (updated: AssessmentSet[]) => void;
  disabled?: boolean;
  /** 0-based indexes of sets that failed validation (highlight + focus). */
  errorIndexes?: readonly number[];
  /** Optional resolver: messages that belong only to the selected set index. */
  messagesForSetIndex?: (setIndex: number) => readonly string[];
  /** Fallback messages when index-scoped resolver is not provided. */
  selectedSetMessages?: readonly string[];
}

function emptyTitle(): AssessmentSet['title'] {
  return { english: '', indonesian: '', simplifiedChinese: '' };
}

function setKindName(t: (key: string) => string, purpose: AssessmentSet['purpose'] | undefined) {
  if (purpose === 'TOPIC_PRACTICE') {
    return t('admin.academic.toasts.names.topicPractice');
  }
  return t('admin.academic.toasts.names.checkpoint');
}

function createSet(purpose: AssessmentSet['purpose']): AssessmentSet {
  return {
    id: crypto.randomUUID(),
    purpose,
    title: emptyTitle(),
    examLanguage: 'en',
    difficulty: purpose === 'TOPIC_PRACTICE' ? 'STANDARD' : null,
    questionIds: [],
    outlineItemIds: [],
    objectiveIds: [],
    lessonResourceId: purpose === 'CHECKPOINT' ? null : null,
    estimatedMinutes: purpose === 'CHECKPOINT' ? 15 : 20,
    feedbackMode: 'IMMEDIATE',
    passPolicy: purpose === 'CHECKPOINT' ? 'ALL_CORRECT_NO_STRONG_ASSISTANCE' : null,
    remediationResourceIds: [],
  };
}

function toggleId(ids: string[], id: string, checked: boolean): string[] {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((value) => value !== id);
}

function questionPreview(q: Question, index: number, untitled: string): string {
  const text = q.stem.find((b) => b.kind === 'TEXT');
  const math = q.stem.find((b) => b.kind === 'MATH');
  if (text && 'text' in text && text.text) return text.text;
  if (math && 'latex' in math && math.latex) return math.latex;
  return untitled.replace('{{index}}', String(index + 1));
}

function resourceLabel(r: StudyResource): string {
  return r.title.english || r.title.indonesian || r.title.simplifiedChinese || r.id.slice(0, 8);
}

function checkpointDuplicateIndexes(sets: readonly AssessmentSet[]): Set<number> {
  const firstIndexByKey = new Map<string, number>();
  const duplicates = new Set<number>();
  sets.forEach((set, index) => {
    if (set.purpose !== 'CHECKPOINT' || !set.lessonResourceId) return;
    const key = `${set.lessonResourceId}|${set.examLanguage}`;
    const first = firstIndexByKey.get(key);
    if (first == null) {
      firstIndexByKey.set(key, index);
      return;
    }
    duplicates.add(first);
    duplicates.add(index);
  });
  return duplicates;
}

export function AssessmentSetsEditor({
  assessmentSets,
  questions,
  resources,
  outlineItems,
  objectives,
  onChange,
  disabled = false,
  errorIndexes = [],
  messagesForSetIndex,
  selectedSetMessages = [],
}: AssessmentSetsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const notify = useAdminNotify();
  const [selectedId, setSelectedId] = useState<string | null>(assessmentSets[0]?.id ?? null);

  const selected = assessmentSets.find((s) => s.id === selectedId) ?? assessmentSets[0];
  const selectedIndex = selected ? assessmentSets.findIndex((s) => s.id === selected.id) : -1;
  const detailMessages =
    selectedIndex >= 0
      ? (messagesForSetIndex?.(selectedIndex) ?? selectedSetMessages)
      : selectedSetMessages;
  const lessons = resources.filter((r) => r.kind === 'LESSON');
  const remediations = resources.filter((r) => r.kind === 'REMEDIATION');
  const compatibleQuestions = selected
    ? questions.filter((q) => (q.examLanguage || 'en') === selected.examLanguage)
    : [];
  const errorIndexSet = new Set(errorIndexes);
  const duplicateCheckpointIndexes = checkpointDuplicateIndexes(assessmentSets);
  const selectedHasError =
    selectedIndex >= 0 &&
    (errorIndexSet.has(selectedIndex) || duplicateCheckpointIndexes.has(selectedIndex));

  const updateSelected = (patch: Partial<AssessmentSet>) => {
    if (!selected) return;
    onChange(assessmentSets.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  };

  const handleAdd = (purpose: AssessmentSet['purpose']) => {
    if (disabled) return;
    const next = createSet(purpose);
    onChange([...assessmentSets, next]);
    setSelectedId(next.id);
    notify(
      t('admin.academic.toasts.added', {
        name: setKindName(t, purpose),
      }),
      'success',
    );
  };

  const handleDelete = (id: string) => {
    if (disabled) return;
    const target = assessmentSets.find((s) => s.id === id);
    const ordered = assessmentSets.map((s) => s.id);
    const nextSelected = selectionAfterDeleteId(ordered, id);
    onChange(assessmentSets.filter((s) => s.id !== id));
    setSelectedId(nextSelected);
    notify(
      t('admin.academic.toasts.removed', {
        name: setKindName(t, target?.purpose),
      }),
      'error',
    );
  };

  const setTitleField = (field: keyof AssessmentSet['title'], value: string) => {
    if (!selected) return;
    updateSelected({ title: { ...selected.title, [field]: value } });
  };

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header admin-split-sidebar-header-stack">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.assessment.title')} ({assessmentSets.length})
          </h3>
          <div className="admin-equal-actions" data-count="2">
            <button
              type="button"
              className="btn-secondary admin-btn-compact"
              onClick={() => handleAdd('CHECKPOINT')}
              disabled={disabled}
            >
              + {t('admin.academic.assessment.addCheckpoint')}
            </button>
            <button
              type="button"
              className="btn-secondary admin-btn-compact"
              onClick={() => handleAdd('TOPIC_PRACTICE')}
              disabled={disabled}
            >
              + {t('admin.academic.assessment.addTopicPractice')}
            </button>
          </div>
        </div>

        <div className="admin-stack-tight">
          {assessmentSets.length === 0 ? (
            <p className="admin-muted">{t('admin.academic.assessment.empty')}</p>
          ) : null}
          {assessmentSets.map((set, idx) => {
            const isSelected = set.id === selected?.id;
            const needsAttention = errorIndexSet.has(idx) || duplicateCheckpointIndexes.has(idx);
            const label =
              set.title.english ||
              set.title.indonesian ||
              set.title.simplifiedChinese ||
              t('admin.academic.assessment.untitled', { index: idx + 1 });
            return (
              <button
                key={set.id}
                type="button"
                className={`outline-tree-item admin-list-button${isSelected ? ' outline-tree-item-selected' : ''}${needsAttention ? ' admin-list-item-error' : ''}`}
                onClick={() => setSelectedId(set.id)}
                aria-invalid={needsAttention || undefined}
              >
                <div className="admin-ellipsis">
                  <span className="admin-list-index">
                    {set.purpose === 'CHECKPOINT' ? 'CP' : 'TP'}
                  </span>
                  <span className="admin-list-preview">{label}</span>
                  {needsAttention ? (
                    <span className="admin-list-error-badge" aria-hidden="true">
                      !
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className={`admin-stack-lg${selectedHasError ? ' admin-detail-has-errors' : ''}`}>
          <div className="admin-row-between">
            <h3 className="admin-detail-title">{t('admin.academic.assessment.editTitle')}</h3>
            <AdminRemoveButton
              label={t('admin.academic.assessment.delete')}
              onClick={() => handleDelete(selected.id)}
              disabled={disabled}
            />
          </div>

          {detailMessages.length > 0 ? (
            <ul className="admin-field-error-list" role="alert">
              {detailMessages.map((msg) => (
                <li key={msg} className="admin-field-error">
                  {msg}
                </li>
              ))}
            </ul>
          ) : null}

          {duplicateCheckpointIndexes.has(selectedIndex) ? (
            <p className="admin-field-error" role="alert">
              {t('admin.academic.assessment.duplicateCheckpointLanguage')}
            </p>
          ) : null}

          <div className="admin-grid-3">
            <div>
              <label htmlFor="as-purpose" className="admin-field-label">
                {t('admin.academic.assessment.purpose')}
              </label>
              <select
                id="as-purpose"
                className="text-input admin-field-control"
                value={selected.purpose}
                disabled={disabled}
                onChange={(e) => {
                  const purpose = e.target.value as AssessmentSet['purpose'];
                  updateSelected({
                    purpose,
                    passPolicy:
                      purpose === 'CHECKPOINT' ? 'ALL_CORRECT_NO_STRONG_ASSISTANCE' : null,
                    lessonResourceId:
                      purpose === 'CHECKPOINT' ? (selected.lessonResourceId ?? null) : null,
                  });
                }}
              >
                <option value="CHECKPOINT">
                  {t('admin.academic.assessment.purposeCheckpoint')}
                </option>
                <option value="TOPIC_PRACTICE">
                  {t('admin.academic.assessment.purposeTopic')}
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="as-lang" className="admin-field-label">
                {t('admin.academic.assessment.examLanguage')}
              </label>
              <select
                id="as-lang"
                className="text-input admin-field-control"
                value={selected.examLanguage}
                disabled={disabled}
                aria-invalid={duplicateCheckpointIndexes.has(selectedIndex) ? true : undefined}
                onChange={(e) => {
                  const examLanguage = e.target.value as ExamLanguage;
                  const nextIds = selected.questionIds.filter((id) => {
                    const q = questions.find((item) => item.id === id);
                    return q && (q.examLanguage || 'en') === examLanguage;
                  });
                  updateSelected({ examLanguage, questionIds: nextIds });
                }}
              >
                <option value="en">{t('admin.academic.questions.examLangEn')}</option>
                <option value="zh-CN">{t('admin.academic.questions.examLangZh')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="as-diff" className="admin-field-label">
                {t('admin.academic.assessment.difficulty')}
              </label>
              <select
                id="as-diff"
                className="text-input admin-field-control"
                value={selected.difficulty ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const value = e.target.value;
                  updateSelected({
                    difficulty: (value || null) as QuestionDifficulty | null,
                  });
                }}
              >
                <option value="">{t('admin.academic.assessment.difficultyNone')}</option>
                <option value="FOUNDATION">
                  {t('admin.academic.questions.difficultyFoundation')}
                </option>
                <option value="STANDARD">{t('admin.academic.questions.difficultyStandard')}</option>
                <option value="ADVANCED">{t('admin.academic.questions.difficultyAdvanced')}</option>
              </select>
            </div>
          </div>

          <div className="admin-grid-3">
            <div>
              <label htmlFor="as-title-en" className="admin-field-label">
                {t('admin.academic.assessment.titleEnglish')}
              </label>
              <input
                id="as-title-en"
                className="text-input admin-field-control"
                value={selected.title.english ?? ''}
                disabled={disabled}
                onChange={(e) => setTitleField('english', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="as-title-id" className="admin-field-label">
                {t('admin.academic.assessment.titleIndonesian')}
              </label>
              <input
                id="as-title-id"
                className="text-input admin-field-control"
                value={selected.title.indonesian ?? ''}
                disabled={disabled}
                onChange={(e) => setTitleField('indonesian', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="as-title-zh" className="admin-field-label">
                {t('admin.academic.assessment.titleChinese')}
              </label>
              <input
                id="as-title-zh"
                className="text-input admin-field-control"
                value={selected.title.simplifiedChinese ?? ''}
                disabled={disabled}
                onChange={(e) => setTitleField('simplifiedChinese', e.target.value)}
              />
            </div>
          </div>

          <div className="admin-grid-3">
            <div>
              <label htmlFor="as-feedback" className="admin-field-label">
                {t('admin.academic.assessment.feedbackMode')}
              </label>
              <select
                id="as-feedback"
                className="text-input admin-field-control"
                value={selected.feedbackMode ?? 'IMMEDIATE'}
                disabled={disabled}
                onChange={(e) =>
                  updateSelected({
                    feedbackMode: e.target.value as NonNullable<AssessmentSet['feedbackMode']>,
                  })
                }
              >
                <option value="IMMEDIATE">
                  {t('admin.academic.assessment.feedbackImmediate')}
                </option>
                <option value="SET_END">{t('admin.academic.assessment.feedbackSetEnd')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="as-minutes" className="admin-field-label">
                {t('admin.academic.assessment.estimatedMinutes')}
              </label>
              <input
                id="as-minutes"
                type="number"
                min={1}
                max={180}
                className="text-input admin-field-control"
                value={selected.estimatedMinutes ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateSelected({
                    estimatedMinutes: raw === '' ? null : Number(raw),
                  });
                }}
              />
            </div>
            {selected.purpose === 'CHECKPOINT' ? (
              <div>
                <label htmlFor="as-pass" className="admin-field-label">
                  {t('admin.academic.assessment.passPolicy')}
                </label>
                <select
                  id="as-pass"
                  className="text-input admin-field-control"
                  value={selected.passPolicy ?? 'ALL_CORRECT_NO_STRONG_ASSISTANCE'}
                  disabled={disabled}
                  onChange={() =>
                    updateSelected({ passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE' })
                  }
                >
                  <option value="ALL_CORRECT_NO_STRONG_ASSISTANCE">
                    {t('admin.academic.assessment.passPolicyAllCorrect')}
                  </option>
                </select>
              </div>
            ) : (
              <div />
            )}
          </div>

          {selected.purpose === 'CHECKPOINT' ? (
            <div>
              <label htmlFor="as-lesson" className="admin-field-label">
                {t('admin.academic.assessment.lessonResource')}
              </label>
              {lessons.length === 0 ? (
                <p className="admin-muted">{t('admin.academic.assessment.noLessons')}</p>
              ) : (
                <select
                  id="as-lesson"
                  className="text-input admin-field-control"
                  value={selected.lessonResourceId ?? ''}
                  disabled={disabled}
                  aria-invalid={!selected.lessonResourceId || selectedHasError ? true : undefined}
                  onChange={(e) => updateSelected({ lessonResourceId: e.target.value || null })}
                >
                  <option value="">{t('admin.academic.assessment.lessonNone')}</option>
                  {lessons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {resourceLabel(r)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : null}

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.assessment.questions')}
            </legend>
            <p className="admin-muted">{t('admin.academic.assessment.compatibleOnly')}</p>
            {compatibleQuestions.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.assessment.noQuestions')}</p>
            ) : (
              <div className="admin-check-list">
                {compatibleQuestions.map((q, index) => (
                  <label key={q.id} className="admin-check-row">
                    <input
                      type="checkbox"
                      checked={selected.questionIds.includes(q.id)}
                      onChange={(e) => {
                        const next = toggleId(selected.questionIds, q.id, e.target.checked);
                        // Cap at 12 (contract hard max)
                        updateSelected({ questionIds: next.slice(0, 12) });
                      }}
                    />
                    <span>
                      {questionPreview(
                        q,
                        index,
                        t('admin.academic.questions.untitled', { index: index + 1 }),
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.assessment.outlineRefs')}
            </legend>
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
                        updateSelected({
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
          </fieldset>

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.assessment.objectiveRefs')}
            </legend>
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
                        updateSelected({
                          objectiveIds: toggleId(selected.objectiveIds, item.id, e.target.checked),
                        })
                      }
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="admin-fieldset" disabled={disabled}>
            <legend className="admin-fieldset-legend">
              {t('admin.academic.assessment.remediationResources')}
            </legend>
            <div className="admin-check-list">
              {remediations.map((r) => (
                <label key={r.id} className="admin-check-row">
                  <input
                    type="checkbox"
                    checked={(selected.remediationResourceIds ?? []).includes(r.id)}
                    onChange={(e) =>
                      updateSelected({
                        remediationResourceIds: toggleId(
                          selected.remediationResourceIds ?? [],
                          r.id,
                          e.target.checked,
                        ).slice(0, 8),
                      })
                    }
                  />
                  <span>{resourceLabel(r)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : (
        <p className="admin-muted">{t('admin.academic.assessment.empty')}</p>
      )}
    </div>
  );
}
