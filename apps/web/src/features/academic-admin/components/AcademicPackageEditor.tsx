import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { AdminNotifyContext } from '../adminNotify';
import { OfficialSourcePanel } from './OfficialSourcePanel';
import { SyllabusOutlineEditor } from './SyllabusOutlineEditor';
import { LearningObjectivesEditor } from './LearningObjectivesEditor';
import { StudyResourcesEditor } from './StudyResourcesEditor';
import { QuestionEditor } from './QuestionEditor';
import { AssessmentSetsEditor } from './AssessmentSetsEditor';
import { MockPaperEditor } from './MockPaperEditor';
import { TermBankEditor } from './TermBankEditor';
import { ArchiveModal } from './ArchiveModal';
import {
  saveAcademicPackageDraft,
  publishAcademicPackage,
  archiveAcademicPackage,
  getAcademicPackage,
  ApiError,
} from '../api/academicAdminApi';
import { pruneEmptyLocalizedVersions } from '../localizedContentDraft';
import { ensureSingleMockShell } from '../mockDraft';
import { normalizeOfficialSyllabus } from '../officialSyllabusNormalize';
import { toDraftProvenanceInput, toEditableProvenance } from '../provenanceDraft';
import { formatAdminDate } from '../formatAdminDate';
import { ensureExamStructure } from '../subjectProfile';
import {
  assessmentSetErrorIndexes,
  assessmentSetIndexFromPath,
  fieldErrorsFromMapped,
  firstTabFromMapped,
  humanLocationLabel,
  localizeMappedMessage,
  mapValidationViolations,
  type OfficialFieldKey,
  type ValidationFieldKey,
} from '../validationMapping';
import type {
  AcademicPackage,
  AcademicValidationProblem,
  AcademicValidationViolation,
  AdminEditorTab,
  AcademicPackageDraftInput,
} from '../types';
import '../academic-admin.css';

function FieldErrorList({
  messages,
}: {
  messages: string[] | undefined;
}): React.JSX.Element | null {
  if (!messages?.length) return null;
  if (messages.length === 1) {
    return (
      <p className="admin-field-error" role="alert">
        {messages[0]}
      </p>
    );
  }
  return (
    <ul className="admin-field-error-list" role="alert">
      {messages.map((msg) => (
        <li key={msg} className="admin-field-error">
          {msg}
        </li>
      ))}
    </ul>
  );
}

interface AcademicPackageEditorProps {
  initialPackage: AcademicPackage;
  onBackToList: () => void;
}

function withNormalizedDraft(pkg: AcademicPackage): AcademicPackage {
  const examStructure = ensureExamStructure(pkg.draft.officialSyllabus, pkg.subject);
  const officialSyllabus = normalizeOfficialSyllabus({
    ...pkg.draft.officialSyllabus,
    subject: pkg.subject,
    examStructure,
  });
  return {
    ...pkg,
    draft: {
      ...pkg.draft,
      terms: pkg.draft.terms ?? [],
      officialSyllabus,
      // Persist-ready single mock shell so publish path is reachable without a silent empty mocks[].
      mocks: ensureSingleMockShell(pkg.draft.mocks ?? [], examStructure),
    },
  };
}

export function AcademicPackageEditor({
  initialPackage,
  onBackToList,
}: AcademicPackageEditorProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const [pkg, setPkg] = useState<AcademicPackage>(() => withNormalizedDraft(initialPackage));
  const [activeTab, setActiveTab] = useState<AdminEditorTab>('source');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
    durationMs: number;
  } | null>(null);
  const [validationViolations, setValidationViolations] = useState<
    AcademicValidationViolation[] | null
  >(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const draft = pkg.draft;
  const busy = isSaving || isPublishing || isArchiving || isReloading;
  const isArchived = pkg.status === 'ARCHIVED';
  const isCorrectionDraft = pkg.status === 'PUBLISHED' && pkg.hasUnpublishedChanges;

  const mappedViolations = useMemo(() => {
    if (!validationViolations?.length) return [];
    return mapValidationViolations(validationViolations);
  }, [validationViolations]);

  const fieldErrors = useMemo(() => {
    if (!mappedViolations.length) return {} as Partial<Record<ValidationFieldKey, string[]>>;
    return fieldErrorsFromMapped(mappedViolations, t);
  }, [mappedViolations, t]);

  const officialFieldErrors = useMemo(() => {
    const keys: OfficialFieldKey[] = [
      'sourceLinks',
      'authority',
      'editionLabel',
      'retrievedAt',
      'lastCheckedAt',
      'publishedOn',
      'effectiveOn',
      'updatedOn',
      'examStructure',
      'permittedUse',
    ];
    const out: Partial<Record<OfficialFieldKey, string[]>> = {};
    for (const key of keys) {
      if (fieldErrors[key]) out[key] = fieldErrors[key];
    }
    return out;
  }, [fieldErrors]);

  const locationContext = useMemo(() => {
    const assessmentSetLabels = (draft.assessmentSets ?? []).map((set) => {
      return set.title.english || set.title.indonesian || set.title.simplifiedChinese || null;
    });
    const questionLabels = draft.questions.map((q) => {
      const text = q.stem.find((b) => b.kind === 'TEXT');
      if (text && 'text' in text && text.text) return text.text.slice(0, 48);
      const math = q.stem.find((b) => b.kind === 'MATH');
      if (math && 'latex' in math && math.latex) return math.latex.slice(0, 48);
      return null;
    });
    const outlineLabels = draft.outlineItems.map((item) => {
      return (
        item.summary.english || item.summary.indonesian || item.summary.simplifiedChinese || null
      );
    });
    return { assessmentSetLabels, questionLabels, outlineLabels };
  }, [draft.assessmentSets, draft.questions, draft.outlineItems]);

  const assessmentErrorIndexes = useMemo(
    () => assessmentSetErrorIndexes(mappedViolations),
    [mappedViolations],
  );

  /** Messages for the assessment tab overall (collection-level or any set). */
  const assessmentTabMessages = useMemo(
    () => fieldErrors.assessment ?? [],
    [fieldErrors.assessment],
  );

  const tabsWithErrors = useMemo(() => {
    const set = new Set<AdminEditorTab>();
    for (const item of mappedViolations) {
      set.add(item.tab);
    }
    return set;
  }, [mappedViolations]);

  const showToast = (message: string, tone: ToastTone = 'success', durationMs = 4000) => {
    setToast({ message, tone, durationMs });
  };

  const notifyAction = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone, durationMs: 2000 });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const applyPackageUpdate = (next: AcademicPackage) => {
    setValidationViolations(null);
    setPkg(withNormalizedDraft(next));
  };

  const applyViolations = (violations: AcademicValidationViolation[]) => {
    setValidationViolations(violations);
    setActiveTab(firstTabFromMapped(mapValidationViolations(violations)));
  };

  const tabLabel = (tab: AdminEditorTab): string => t(`admin.academic.validation.tabs.${tab}`);

  /** On optimistic concurrency conflict, reload server package so expectedDraftRevision is coherent. */
  const reloadPackageAfterStale = async (fallbackDetail?: string) => {
    setIsReloading(true);
    try {
      const fresh = await getAcademicPackage(pkg.id);
      setPkg(withNormalizedDraft(fresh));
      setValidationViolations(null);
      showToast(fallbackDetail || t('admin.academic.toasts.staleRevisionReloaded'), 'info');
    } catch (reloadErr) {
      showToast(
        reloadErr instanceof Error
          ? reloadErr.message
          : fallbackDetail || t('admin.academic.toasts.staleRevision'),
        'error',
      );
    } finally {
      setIsReloading(false);
    }
  };

  const constructDraftInput = (): AcademicPackageDraftInput => {
    const examShape = ensureExamStructure(draft.officialSyllabus, pkg.subject);
    const officialSyllabus = normalizeOfficialSyllabus({
      ...draft.officialSyllabus,
      subject: pkg.subject,
      examStructure: examShape,
    });
    const mocks = ensureSingleMockShell(draft.mocks ?? [], examShape);
    return {
      officialSyllabus,
      outlineItems: draft.outlineItems,
      learningObjectives: draft.learningObjectives,
      terms: draft.terms ?? [],
      resources: draft.resources.map((r) => ({
        id: r.id,
        ...(r.kind ? { kind: r.kind } : {}),
        title: r.title,
        outlineItemIds: r.outlineItemIds,
        objectiveIds: r.objectiveIds,
        // Only send filled language versions (backend requires ≥1; empty optional langs omitted).
        versions: pruneEmptyLocalizedVersions(r.versions ?? []),
        ...(r.kind === 'TERMINOLOGY' ? { requiredTermIds: r.requiredTermIds ?? [] } : {}),
        provenance: toDraftProvenanceInput(toEditableProvenance(r.provenance)),
      })),
      questions: draft.questions.map((q) => ({
        id: q.id,
        examLanguage: q.examLanguage || 'en',
        ...(q.difficulty ? { difficulty: q.difficulty } : {}),
        stem: q.stem,
        options: q.options,
        ...(q.correctOptionKey ? { correctOptionKey: q.correctOptionKey } : {}),
        explanations: pruneEmptyLocalizedVersions(q.explanations ?? []),
        outlineItemIds: q.outlineItemIds,
        objectiveIds: q.objectiveIds,
        // VS-009: round-trip assessment metadata even before dedicated admin editors ship.
        // Omitting these fields silently drops authored hints / solution links on save.
        ...(q.hintTiers != null ? { hintTiers: q.hintTiers } : {}),
        ...(q.commonMistakeNotes != null ? { commonMistakeNotes: q.commonMistakeNotes } : {}),
        ...(q.relatedResourceIds != null ? { relatedResourceIds: q.relatedResourceIds } : {}),
        authoredTermAttachments: q.authoredTermAttachments ?? [],
        provenance: toDraftProvenanceInput(toEditableProvenance(q.provenance)),
      })),
      mocks: mocks.map((m) => ({
        id: m.id,
        title: m.title ?? '',
        examLanguage: m.examLanguage || 'en',
        durationMinutes: m.durationMinutes ?? examShape.durationMinutes,
        totalPoints: m.totalPoints ?? examShape.totalPoints,
        questionCount: m.questionCount ?? examShape.questionCount,
        questionType: m.questionType ?? examShape.questionType,
        questions: m.questions,
        provenance: toDraftProvenanceInput(toEditableProvenance(m.provenance)),
      })),
      // Backend treats omit as empty array — always send so AssessmentSets are not wiped.
      assessmentSets: draft.assessmentSets ?? [],
    };
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setValidationViolations(null);
    try {
      const updated = await saveAcademicPackageDraft(
        pkg.id,
        pkg.draftRevision,
        constructDraftInput(),
      );
      setPkg(withNormalizedDraft(updated));
      showToast(t('admin.academic.toasts.draftSaved'));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        await reloadPackageAfterStale(
          err.problem && 'detail' in err.problem && err.problem.detail
            ? err.problem.detail
            : undefined,
        );
      } else if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        applyViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(
          err instanceof Error ? err.message : t('admin.academic.toasts.saveFailed'),
          'error',
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setValidationViolations(null);
    try {
      // Server publishes the saved draft only — persist local edits first.
      const saved = await saveAcademicPackageDraft(
        pkg.id,
        pkg.draftRevision,
        constructDraftInput(),
      );
      setPkg(withNormalizedDraft(saved));
      const updated = await publishAcademicPackage(saved.id, saved.draftRevision);
      setPkg(withNormalizedDraft(updated));
      showToast(
        t('admin.academic.toasts.published', {
          date: formatAdminDate(
            updated.activeRevision?.publishedAt ?? updated.updatedAt,
            i18n.language,
          ),
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        await reloadPackageAfterStale(
          err.problem && 'detail' in err.problem && err.problem.detail
            ? err.problem.detail
            : undefined,
        );
      } else if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        applyViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(
          err instanceof Error ? err.message : t('admin.academic.toasts.publishFailed'),
          'error',
        );
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchiveConfirm = async (reason: string) => {
    setIsArchiving(true);
    try {
      const updated = await archiveAcademicPackage(pkg.id, pkg.draftRevision, reason);
      setPkg(withNormalizedDraft(updated));
      setShowArchiveModal(false);
      showToast(t('admin.academic.toasts.archived'));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        await reloadPackageAfterStale(
          err.problem && 'detail' in err.problem && err.problem.detail
            ? err.problem.detail
            : undefined,
        );
      } else {
        showToast(
          err instanceof Error ? err.message : t('admin.academic.toasts.archiveFailed'),
          'error',
        );
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const statusClass =
    pkg.status === 'PUBLISHED'
      ? 'badge-status-published'
      : pkg.status === 'ARCHIVED'
        ? 'badge-status-archived'
        : 'badge-status-draft';

  const statusLabel =
    pkg.status === 'PUBLISHED'
      ? t('admin.academic.statusPublished')
      : pkg.status === 'ARCHIVED'
        ? t('admin.academic.statusArchived')
        : t('admin.academic.statusDraft');

  const tabs: Array<{ id: AdminEditorTab; label: string; count?: number }> = [
    {
      id: 'source',
      label: t('admin.academic.tabs.source'),
    },
    {
      id: 'objectives',
      label: t('admin.academic.tabs.objectives'),
      count: draft.learningObjectives.length,
    },
    {
      id: 'terms',
      label: t('admin.academic.tabs.terms'),
      count: (draft.terms ?? []).length,
    },
    {
      id: 'resources',
      label: t('admin.academic.tabs.resources'),
      count: draft.resources.length,
    },
    {
      id: 'questions',
      label: t('admin.academic.tabs.questions'),
      count: draft.questions.length,
    },
    {
      id: 'assessment',
      label: t('admin.academic.tabs.assessment'),
      count: draft.assessmentSets?.length ?? 0,
    },
    {
      id: 'mock',
      label: t('admin.academic.tabs.mock'),
    },
  ];

  return (
    <AdminNotifyContext.Provider value={notifyAction}>
      <div className="admin-editor">
        {toast ? (
          <Toast
            message={toast.message}
            tone={toast.tone}
            durationMs={toast.durationMs}
            onDismiss={dismissToast}
          />
        ) : null}

        <header className="admin-editor-header">
          <div className="admin-editor-identity">
            <button type="button" className="admin-back-link" onClick={onBackToList}>
              {t('admin.academic.backToList')}
            </button>

            <div className="admin-editor-title-block">
              <p className="admin-eyebrow">{t('admin.academic.subjectTag')}</p>
              <div className="admin-editor-title-row">
                <h1 className="admin-editor-title">{t('admin.academic.packageHeading')}</h1>
                <div className="admin-editor-badges">
                  <span className={statusClass}>{statusLabel}</span>
                  {pkg.hasUnpublishedChanges && (
                    <span className="badge-unpublished-changes">
                      {isCorrectionDraft
                        ? t('admin.academic.resumeCorrection')
                        : t('admin.academic.hasUnpublishedChanges')}
                    </span>
                  )}
                </div>
              </div>
              <p className="admin-editor-meta">
                {pkg.activeRevision
                  ? t('admin.academic.activeRevision', {
                      date: formatAdminDate(pkg.activeRevision.publishedAt, i18n.language),
                    })
                  : t('admin.academic.noActiveRevision')}
                {' · '}
                {t('admin.academic.lastUpdated', {
                  date: formatAdminDate(pkg.updatedAt, i18n.language),
                })}
              </p>
            </div>
          </div>

          <div className="admin-editor-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveDraft}
              disabled={busy || isArchived}
            >
              {isSaving ? t('admin.academic.saving') : t('admin.academic.saveDraft')}
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handlePublish}
              disabled={busy || isArchived}
            >
              {isPublishing ? t('admin.academic.publishing') : t('admin.academic.publish')}
            </button>

            {pkg.status === 'PUBLISHED' && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setShowArchiveModal(true)}
                disabled={busy}
              >
                {t('admin.academic.archive')}
              </button>
            )}
          </div>
        </header>

        <nav className="admin-tabs" aria-label={t('admin.academic.tabsLabel')}>
          {tabs.map((tab) => {
            const hasErrors = tabsWithErrors.has(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab-btn${activeTab === tab.id ? ' admin-tab-btn-active' : ''}${hasErrors ? ' admin-tab-btn-error' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span>{tab.label}</span>
                {hasErrors ? (
                  <span
                    className="admin-tab-error-dot"
                    aria-label={t('admin.academic.validation.tabHasIssues')}
                  >
                    !
                  </span>
                ) : null}
                {typeof tab.count === 'number' && (
                  <span className="admin-tab-count" aria-hidden="true">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {mappedViolations.length > 0 ? (
          <div className="admin-validation-banner feedback-danger" role="alert">
            <div className="admin-validation-banner-header">
              <p className="admin-validation-banner-title">
                {t('admin.academic.validation.bannerTitle', { count: mappedViolations.length })}
              </p>
              <button
                type="button"
                className="btn-secondary admin-btn-compact-md"
                onClick={() => setValidationViolations(null)}
              >
                {t('admin.academic.validation.dismiss')}
              </button>
            </div>
            <p className="admin-validation-banner-body">
              {t('admin.academic.validation.bannerBody')}
            </p>
            <ul className="admin-validation-issue-list">
              {mappedViolations.map((item, index) => {
                const location = humanLocationLabel(item.path, t, locationContext);
                return (
                  <li key={`${item.path}:${item.code}:${index}`} className="admin-validation-issue">
                    <div className="admin-validation-issue-main">
                      <p className="admin-validation-issue-message">
                        {localizeMappedMessage(item, t)}
                      </p>
                      <p className="admin-validation-issue-meta">
                        {t('admin.academic.validation.whereLabel', { place: location })}
                        {' · '}
                        {tabLabel(item.tab)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact"
                      onClick={() => setActiveTab(item.tab)}
                    >
                      {t('admin.academic.validation.goToTab', { tab: tabLabel(item.tab) })}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="admin-editor-pane">
          {activeTab === 'source' && (
            <div className="admin-stack-xl">
              <OfficialSourcePanel
                syllabus={draft.officialSyllabus}
                isPublished={pkg.status === 'PUBLISHED'}
                fieldErrors={officialFieldErrors}
                onChange={(updatedSyllabus) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, officialSyllabus: updatedSyllabus },
                  })
                }
              />

              <div className="admin-section-with-errors">
                <FieldErrorList messages={fieldErrors.outline} />
                <SyllabusOutlineEditor
                  items={draft.outlineItems}
                  onChange={(updatedItems) =>
                    applyPackageUpdate({
                      ...pkg,
                      draft: { ...draft, outlineItems: updatedItems },
                    })
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="admin-section-with-errors">
              <FieldErrorList messages={fieldErrors.objectives} />
              <LearningObjectivesEditor
                objectives={draft.learningObjectives}
                outlineItems={draft.outlineItems}
                onChange={(updated) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, learningObjectives: updated },
                  })
                }
              />
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="admin-section-with-errors">
              <FieldErrorList messages={fieldErrors.terms} />
              <TermBankEditor
                terms={draft.terms ?? []}
                outlineItems={draft.outlineItems}
                disabled={isArchived}
                onChange={(updated) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, terms: updated },
                  })
                }
              />
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="admin-section-with-errors">
              <FieldErrorList messages={fieldErrors.resources} />
              <StudyResourcesEditor
                resources={draft.resources}
                outlineItems={draft.outlineItems}
                objectives={draft.learningObjectives}
                terms={draft.terms ?? []}
                disabled={isArchived}
                onChange={(updated) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, resources: updated },
                  })
                }
              />
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="admin-section-with-errors">
              <FieldErrorList messages={fieldErrors.questions} />
              <QuestionEditor
                questions={draft.questions}
                outlineItems={draft.outlineItems}
                objectives={draft.learningObjectives}
                resources={draft.resources}
                terms={draft.terms ?? []}
                disabled={isArchived}
                onChange={(updatedQuestions) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, questions: updatedQuestions },
                  })
                }
              />
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="admin-section-with-errors">
              <FieldErrorList
                messages={
                  // Collection-level only at tab top; per-set detail uses selectedSetMessages.
                  assessmentTabMessages.filter((msg) =>
                    mappedViolations.some(
                      (v) =>
                        localizeMappedMessage(v, t) === msg &&
                        assessmentSetIndexFromPath(v.path) == null,
                    ),
                  )
                }
              />
              <AssessmentSetsEditor
                assessmentSets={draft.assessmentSets ?? []}
                questions={draft.questions}
                resources={draft.resources}
                outlineItems={draft.outlineItems}
                objectives={draft.learningObjectives}
                disabled={isArchived}
                errorIndexes={assessmentErrorIndexes}
                selectedSetMessages={assessmentTabMessages}
                messagesForSetIndex={(setIndex) => {
                  const keys = new Set<string>();
                  const out: string[] = [];
                  for (const v of mappedViolations) {
                    if (assessmentSetIndexFromPath(v.path) !== setIndex) continue;
                    const msg = localizeMappedMessage(v, t);
                    if (!keys.has(msg)) {
                      keys.add(msg);
                      out.push(msg);
                    }
                  }
                  return out;
                }}
                onChange={(updatedSets) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, assessmentSets: updatedSets },
                  })
                }
              />
            </div>
          )}

          {activeTab === 'mock' && (
            <div className="admin-section-with-errors">
              <FieldErrorList messages={fieldErrors.mock} />
              <MockPaperEditor
                mocks={draft.mocks}
                availableQuestions={draft.questions}
                disabled={isArchived}
                onChange={(updatedMocks) =>
                  applyPackageUpdate({
                    ...pkg,
                    draft: { ...draft, mocks: updatedMocks },
                  })
                }
              />
            </div>
          )}
        </div>

        {showArchiveModal && (
          <ArchiveModal
            isArchiving={isArchiving}
            onConfirm={handleArchiveConfirm}
            onClose={() => setShowArchiveModal(false)}
          />
        )}
      </div>
    </AdminNotifyContext.Provider>
  );
}
