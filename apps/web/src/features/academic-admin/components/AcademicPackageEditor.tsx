import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OfficialSourcePanel } from './OfficialSourcePanel';
import { SyllabusOutlineEditor } from './SyllabusOutlineEditor';
import { QuestionEditor } from './QuestionEditor';
import { MockPaperEditor } from './MockPaperEditor';
import { PublishValidationModal } from './PublishValidationModal';
import { ArchiveModal } from './ArchiveModal';
import {
  saveAcademicPackageDraft,
  publishAcademicPackage,
  archiveAcademicPackage,
  ApiError,
} from '../api/academicAdminApi';
import type {
  AcademicPackage,
  AcademicValidationProblem,
  AcademicValidationViolation,
  AdminEditorTab,
  AcademicPackageDraftInput,
} from '../types';

interface AcademicPackageEditorProps {
  initialPackage: AcademicPackage;
  onBackToList: () => void;
}

export function AcademicPackageEditor({
  initialPackage,
  onBackToList,
}: AcademicPackageEditorProps): React.JSX.Element {
  const { t } = useTranslation();

  const [pkg, setPkg] = useState<AcademicPackage>(initialPackage);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const constructDraftInput = (): AcademicPackageDraftInput => {
    return {
      officialSyllabus: draft.officialSyllabus,
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
    try {
      const updated = await saveAcademicPackageDraft(
        pkg.id,
        pkg.draftRevision,
        constructDraftInput(),
      );
      setPkg(updated);
      showToast(t('admin.academic.toasts.draftSaved'));
    } catch (err) {
      if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        setValidationViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(err instanceof Error ? err.message : 'Save draft failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const updated = await publishAcademicPackage(pkg.id, pkg.draftRevision);
      setPkg(updated);
      showToast(
        t('admin.academic.toasts.published', {
          revision: updated.activeRevision?.revisionNumber || 1,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.problem && 'violations' in err.problem) {
        setValidationViolations((err.problem as AcademicValidationProblem).violations);
      } else {
        showToast(err instanceof Error ? err.message : 'Publish failed');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchiveConfirm = async (reason: string) => {
    setIsArchiving(true);
    try {
      const updated = await archiveAcademicPackage(pkg.id, pkg.draftRevision, reason);
      setPkg(updated);
      setShowArchiveModal(false);
      showToast(t('admin.academic.toasts.archived'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Archive failed');
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

  return (
    <div className="admin-workspace">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="toast-notification toast-success"
          style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 99999 }}
          role="status"
        >
          <div className="toast-body">{toastMessage}</div>
        </div>
      )}

      {/* Header Bar */}
      <header className="admin-header">
        <div className="admin-header-title">
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.85rem' }}
            onClick={onBackToList}
          >
            ← Back
          </button>

          <h1>CSCA 2025 Mathematics</h1>

          <span className={statusClass}>
            {pkg.status === 'PUBLISHED'
              ? t('admin.academic.statusPublished')
              : pkg.status === 'ARCHIVED'
                ? t('admin.academic.statusArchived')
                : t('admin.academic.statusDraft')}
          </span>

          {pkg.hasUnpublishedChanges && (
            <span className="badge-unpublished-changes">
              ✎ {t('admin.academic.hasUnpublishedChanges')}
            </span>
          )}
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing || pkg.status === 'ARCHIVED'}
          >
            {isSaving ? t('admin.academic.saving') : t('admin.academic.saveDraft')}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handlePublish}
            disabled={isSaving || isPublishing || pkg.status === 'ARCHIVED'}
          >
            {isPublishing ? t('admin.academic.publishing') : t('admin.academic.publish')}
          </button>

          {pkg.status !== 'ARCHIVED' && (
            <button
              type="button"
              className="btn-danger"
              style={{ minHeight: '44px', padding: '10px 16px' }}
              onClick={() => setShowArchiveModal(true)}
              disabled={isSaving || isPublishing}
            >
              {t('admin.academic.archive')}
            </button>
          )}
        </div>
      </header>

      {/* Sub Navigation Tabs */}
      <nav className="admin-tabs" aria-label="Academic package configuration sections">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'source' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          📜 {t('admin.academic.sourcePanel.title')} & {t('admin.academic.outline.title')}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'questions' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          ❓ {t('admin.academic.questions.title')} ({draft.questions.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'mock' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('mock')}
        >
          ⏱ {t('admin.academic.mock.title')}
        </button>
      </nav>

      {/* Main Workspace */}
      <main className="admin-main-pane">
        {activeTab === 'source' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            <OfficialSourcePanel
              syllabus={draft.officialSyllabus}
              isPublished={pkg.status === 'PUBLISHED'}
              onChange={(updatedSyllabus) =>
                setPkg({
                  ...pkg,
                  draft: { ...draft, officialSyllabus: updatedSyllabus },
                })
              }
            />

            <SyllabusOutlineEditor
              items={draft.outlineItems}
              onChange={(updatedItems) =>
                setPkg({
                  ...pkg,
                  draft: { ...draft, outlineItems: updatedItems },
                })
              }
            />
          </div>
        )}

        {activeTab === 'questions' && (
          <QuestionEditor
            questions={draft.questions}
            outlineItems={draft.outlineItems}
            onChange={(updatedQuestions) =>
              setPkg({
                ...pkg,
                draft: { ...draft, questions: updatedQuestions },
              })
            }
          />
        )}

        {activeTab === 'mock' && (
          <MockPaperEditor
            mocks={draft.mocks}
            availableQuestions={draft.questions}
            onChange={(updatedMocks) =>
              setPkg({
                ...pkg,
                draft: { ...draft, mocks: updatedMocks },
              })
            }
          />
        )}
      </main>

      {/* Validation Modal */}
      {validationViolations && (
        <PublishValidationModal
          violations={validationViolations}
          onClose={() => setValidationViolations(null)}
        />
      )}

      {/* Archive Modal */}
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
