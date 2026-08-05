import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  ApiError,
} from '../api/academicAdminApi';
import { normalizeOfficialSyllabus } from '../officialSyllabusNormalize';
import {
  fieldErrorsFromMapped,
  firstTabFromMapped,
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

interface AcademicPackageEditorProps {
  initialPackage: AcademicPackage;
  onBackToList: () => void;
}

function withNormalizedSyllabus(pkg: AcademicPackage): AcademicPackage {
  return {
    ...pkg,
    draft: {
      ...pkg.draft,
      officialSyllabus: normalizeOfficialSyllabus(pkg.draft.officialSyllabus),
    },
  };
}

export function AcademicPackageEditor({
  initialPackage,
  onBackToList,
}: AcademicPackageEditorProps): React.JSX.Element {
  const { t } = useTranslation();

  const [pkg, setPkg] = useState<AcademicPackage>(() => withNormalizedSyllabus(initialPackage));
  const [activeTab, setActiveTab] = useState<AdminEditorTab>('source');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationViolations, setValidationViolations] = useState<
    AcademicValidationViolation[] | null
  >(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const draft = pkg.draft;
  const busy = isSaving || isPublishing || isArchiving;
  const isArchived = pkg.status === 'ARCHIVED';

  const fieldErrors = useMemo(() => {
    if (!validationViolations?.length) return {} as Partial<Record<ValidationFieldKey, string>>;
    return fieldErrorsFromMapped(mapValidationViolations(validationViolations), t);
  }, [validationViolations, t]);

  const officialFieldErrors = useMemo(() => {
    const keys: OfficialFieldKey[] = [
      'sourceUrl',
      'authority',
      'editionLabel',
      'retrievedAt',
      'lastCheckedAt',
      'publishedOn',
      'effectiveOn',
      'updatedOn',
      'sourceLanguages',
      'examStructure',
      'permittedUse',
    ];
    const out: Partial<Record<OfficialFieldKey, string>> = {};
    for (const key of keys) {
      if (fieldErrors[key]) out[key] = fieldErrors[key];
    }
    return out;
  }, [fieldErrors]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const applyPackageUpdate = (next: AcademicPackage) => {
    setValidationViolations(null);
    setPkg(withNormalizedSyllabus(next));
  };

  const applyViolations = (violations: AcademicValidationViolation[]) => {
    setValidationViolations(violations);
    setActiveTab(firstTabFromMapped(mapValidationViolations(violations)));
  };

  const constructDraftInput = (): AcademicPackageDraftInput => {
    return {
      officialSyllabus: normalizeOfficialSyllabus(draft.officialSyllabus),
      outlineItems: draft.outlineItems,
      learningObjectives: draft.learningObjectives,
      resources: draft.resources.map((r) => ({
        id: r.id,
        ...(r.kind ? { kind: r.kind } : {}),
        title: r.title,
        outlineItemIds: r.outlineItemIds,
        objectiveIds: r.objectiveIds,
        versions: r.versions,
        provenance: {
          origin: r.provenance.origin || 'YUKCSCA_ORIGINAL',
          ...(r.provenance.provider ? { provider: r.provenance.provider } : {}),
          ...(r.provenance.sourceLocator ? { sourceLocator: r.provenance.sourceLocator } : {}),
          ...(r.provenance.permissionReference
            ? { permissionReference: r.provenance.permissionReference }
            : {}),
        },
      })),
      questions: draft.questions.map((q) => ({
        id: q.id,
        ...(q.examLanguage ? { examLanguage: q.examLanguage } : {}),
        ...(q.difficulty ? { difficulty: q.difficulty } : {}),
        stem: q.stem,
        options: q.options,
        ...(q.correctOptionKey ? { correctOptionKey: q.correctOptionKey } : {}),
        explanations: q.explanations,
        outlineItemIds: q.outlineItemIds,
        objectiveIds: q.objectiveIds,
        provenance: {
          origin: q.provenance.origin || 'YUKCSCA_ORIGINAL',
          ...(q.provenance.provider ? { provider: q.provenance.provider } : {}),
          ...(q.provenance.sourceLocator ? { sourceLocator: q.provenance.sourceLocator } : {}),
          ...(q.provenance.permissionReference
            ? { permissionReference: q.provenance.permissionReference }
            : {}),
        },
      })),
      mocks: draft.mocks.map((m) => ({
        id: m.id,
        ...(m.title ? { title: m.title } : {}),
        ...(m.examLanguage ? { examLanguage: m.examLanguage } : {}),
        durationMinutes: 60,
        totalPoints: 100,
        questionCount: 48,
        questionType: 'SINGLE_ANSWER',
        questions: m.questions,
        provenance: {
          origin: m.provenance.origin || 'YUKCSCA_ORIGINAL',
          ...(m.provenance.provider ? { provider: m.provenance.provider } : {}),
          ...(m.provenance.sourceLocator ? { sourceLocator: m.provenance.sourceLocator } : {}),
          ...(m.provenance.permissionReference
            ? { permissionReference: m.provenance.permissionReference }
            : {}),
        },
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
      setPkg(withNormalizedSyllabus(updated));
      showToast(t('admin.academic.toasts.draftSaved'));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showToast(
          err.problem && 'detail' in err.problem && err.problem.detail
            ? err.problem.detail
            : t('admin.academic.toasts.staleRevision'),
        );
      } else if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        applyViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(err instanceof Error ? err.message : t('admin.academic.toasts.saveFailed'));
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
      setPkg(withNormalizedSyllabus(saved));
      const updated = await publishAcademicPackage(saved.id, saved.draftRevision);
      setPkg(withNormalizedSyllabus(updated));
      showToast(
        t('admin.academic.toasts.published', {
          revision: updated.activeRevision?.revisionNumber || 1,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showToast(
          err.problem && 'detail' in err.problem && err.problem.detail
            ? err.problem.detail
            : t('admin.academic.toasts.staleRevision'),
        );
      } else if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        applyViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(err instanceof Error ? err.message : t('admin.academic.toasts.publishFailed'));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchiveConfirm = async (reason: string) => {
    setIsArchiving(true);
    try {
      const updated = await archiveAcademicPackage(pkg.id, pkg.draftRevision, reason);
      setPkg(withNormalizedSyllabus(updated));
      setShowArchiveModal(false);
      showToast(t('admin.academic.toasts.archived'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.academic.toasts.archiveFailed'));
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
      {toastMessage && (
        <div className="toast toast-success admin-toast" role="status">
          <div className="toast-body">{toastMessage}</div>
        </div>
      )}

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
                    {t('admin.academic.hasUnpublishedChanges')}
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

      {validationViolations && validationViolations.length > 0 ? (
        <div className="admin-validation-banner feedback-danger" role="alert">
          <p className="admin-validation-banner-title">
            {t('admin.academic.validation.bannerTitle', { count: validationViolations.length })}
          </p>
          <p className="admin-validation-banner-body">{t('admin.academic.validation.bannerBody')}</p>
          <button
            type="button"
            className="btn-secondary admin-btn-compact-md"
            onClick={() => setValidationViolations(null)}
          >
            {t('admin.academic.validation.dismiss')}
          </button>
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
              {fieldErrors.outline ? (
                <p className="admin-field-error" role="alert">
                  {fieldErrors.outline}
                </p>
              ) : null}
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
            {fieldErrors.objectives ? (
              <p className="admin-field-error" role="alert">
                {fieldErrors.objectives}
              </p>
            ) : null}
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
            {fieldErrors.resources ? (
              <p className="admin-field-error" role="alert">
                {fieldErrors.resources}
              </p>
            ) : null}
            <StudyResourcesEditor
              resources={draft.resources}
              outlineItems={draft.outlineItems}
              objectives={draft.learningObjectives}
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
            {fieldErrors.questions ? (
              <p className="admin-field-error" role="alert">
                {fieldErrors.questions}
              </p>
            ) : null}
            <QuestionEditor
              questions={draft.questions}
              outlineItems={draft.outlineItems}
              objectives={draft.learningObjectives}
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
            {fieldErrors.mock ? (
              <p className="admin-field-error" role="alert">
                {fieldErrors.mock}
              </p>
            ) : null}
            <MockPaperEditor
              mocks={draft.mocks}
              availableQuestions={draft.questions}
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
