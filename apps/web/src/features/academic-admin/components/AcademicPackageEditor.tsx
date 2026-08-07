import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { OfficialSourcePanel } from './OfficialSourcePanel';
import { SyllabusOutlineEditor } from './SyllabusOutlineEditor';
import { LearningObjectivesEditor } from './LearningObjectivesEditor';
import { StudyResourcesEditor } from './StudyResourcesEditor';
import { QuestionEditor } from './QuestionEditor';
import { MockPaperEditor } from './MockPaperEditor';
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
import { ensureExamStructure } from '../subjectProfile';
import {
  fieldErrorsFromMapped,
  firstTabFromMapped,
  localizeMappedMessage,
  mapValidationViolations,
  shortValidationPath,
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
  const { t } = useTranslation();

  const [pkg, setPkg] = useState<AcademicPackage>(() => withNormalizedDraft(initialPackage));
  const [activeTab, setActiveTab] = useState<AdminEditorTab>('source');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
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

  const showToast = (message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone });
  };

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
      resources: draft.resources.map((r) => ({
        id: r.id,
        ...(r.kind ? { kind: r.kind } : {}),
        title: r.title,
        outlineItemIds: r.outlineItemIds,
        objectiveIds: r.objectiveIds,
        // Only send filled language versions (backend requires ≥1; empty optional langs omitted).
        versions: pruneEmptyLocalizedVersions(r.versions ?? []),
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
          revision: updated.activeRevision?.revisionNumber || 1,
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
      id: 'mock',
      label: t('admin.academic.tabs.mock'),
    },
  ];

  return (
    <div className="admin-editor">
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} /> : null}

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
                    revision: pkg.activeRevision.revisionNumber,
                    date: new Date(pkg.activeRevision.publishedAt).toLocaleDateString(),
                  })
                : t('admin.academic.noActiveRevision')}
              {' · '}
              {t('admin.academic.draftRevision', { revision: pkg.draftRevision })}
            </p>
            {isCorrectionDraft ? (
              <p className="admin-hint">{t('admin.academic.correctionDraftHint')}</p>
            ) : null}
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab-btn ${activeTab === tab.id ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="admin-tab-count" aria-hidden="true">
                {tab.count}
              </span>
            )}
          </button>
        ))}
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
            {mappedViolations.map((item, index) => (
              <li key={`${item.path}:${item.code}:${index}`} className="admin-validation-issue">
                <div className="admin-validation-issue-main">
                  <p className="admin-validation-issue-message">{localizeMappedMessage(item, t)}</p>
                  <p className="admin-validation-issue-meta">
                    {t('admin.academic.validation.pathLabel', {
                      path: shortValidationPath(item.path),
                    })}
                    {' · '}
                    {item.code}
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
            ))}
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

        {activeTab === 'resources' && (
          <div className="admin-section-with-errors">
            <FieldErrorList messages={fieldErrors.resources} />
            <StudyResourcesEditor
              resources={draft.resources}
              outlineItems={draft.outlineItems}
              objectives={draft.learningObjectives}
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
  );
}
