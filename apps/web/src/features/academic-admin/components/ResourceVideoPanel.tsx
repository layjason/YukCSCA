import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Film, RefreshCw, Upload, Video, X } from 'lucide-react';
import { VideoStatusBadge } from './VideoStatusBadge';
import { VideoUploader } from './VideoUploader';
import { ScriptEditor } from './ScriptEditor';
import { DraftVideoReview } from './DraftVideoReview';
import { AdminRemoveButton } from './AdminRemoveButton';
import {
  getAcademicVideo,
  getSceneSpecification,
  retryAcademicVideoValidation,
  ApiError,
} from '../api/academicAdminApi';
import type {
  AcademicVideoAsset,
  ExplanationLanguage,
  RenderJob,
  ResourceVideoAttachment,
  SceneSpecification,
} from '../types';

interface ResourceVideoPanelProps {
  resourceId?: string;
  resourceKind?: 'LESSON' | 'REMEDIATION';
  videos?: ResourceVideoAttachment[];
  onChange: (updatedVideos: ResourceVideoAttachment[]) => void;
  /** Persist the draft handle immediately (CR-03: confirm, spec, enqueue, SUCCEEDED). */
  onDurabilityCommit?: (updatedVideos: ResourceVideoAttachment[]) => void;
  disabled?: boolean;
}

const EXPLANATION_LANGUAGES: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];
const VALIDATION_POLL_MS = 5000;

/** Tone chip for a render-job state so waiting/failed states scan at a glance. */
function jobStateTagClass(state: RenderJob['state']): string {
  switch (state) {
    case 'SUCCEEDED':
      return 'yukcsca-tag-success';
    case 'FAILED':
      return 'yukcsca-tag-danger';
    case 'RUNNING':
      return 'yukcsca-tag-warning';
    default:
      return 'yukcsca-tag-info';
  }
}

function attachmentsKey(videos: ResourceVideoAttachment[]): string {
  return videos
    .map((v) => `${v.language}:${v.videoAssetId ?? ''}:${v.sceneSpecificationId ?? ''}`)
    .sort()
    .join('|');
}

export function ResourceVideoPanel({
  videos = [],
  onChange,
  onDurabilityCommit,
  disabled = false,
}: ResourceVideoPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Record<string, AcademicVideoAsset>>({});
  const [specs, setSpecs] = useState<Record<string, SceneSpecification>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteLang, setConfirmDeleteLang] = useState<ExplanationLanguage | null>(null);

  // Modal dialog states
  const [uploaderLang, setUploaderLang] = useState<ExplanationLanguage | null>(null);
  const [scriptEditorLang, setScriptEditorLang] = useState<ExplanationLanguage | null>(null);
  const [scriptEditorSpecId, setScriptEditorSpecId] = useState<string | null>(null);
  const [reviewAssetId, setReviewAssetId] = useState<string | null>(null);
  const [reviewLang, setReviewLang] = useState<ExplanationLanguage | null>(null);

  const videosRef = useRef(videos);
  videosRef.current = videos;
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const specsRef = useRef(specs);
  specsRef.current = specs;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDurabilityCommitRef = useRef(onDurabilityCommit);
  onDurabilityCommitRef.current = onDurabilityCommit;

  const applyVideos = (nextVideos: ResourceVideoAttachment[], persist: boolean) => {
    videosRef.current = nextVideos;
    onChange(nextVideos);
    if (persist) onDurabilityCommit?.(nextVideos);
  };
  const loadGenerationRef = useRef<Record<string, number>>({});
  const videoKey = useMemo(() => attachmentsKey(videos), [videos]);

  const loadAttachmentData = useCallback(async (att: ResourceVideoAttachment) => {
    const requestId = (loadGenerationRef.current[att.language] ?? 0) + 1;
    loadGenerationRef.current[att.language] = requestId;
    setLoading((curr) => ({ ...curr, [att.language]: true }));
    try {
      let asset: AcademicVideoAsset | undefined;
      let spec: SceneSpecification | undefined;
      if (att.videoAssetId) {
        asset = await getAcademicVideo(att.videoAssetId);
      }
      if (att.sceneSpecificationId) {
        spec = await getSceneSpecification(att.sceneSpecificationId);
      }
      if (loadGenerationRef.current[att.language] !== requestId) {
        return { asset, spec };
      }
      if (asset) {
        setAssets((curr) => ({ ...curr, [att.language]: asset }));
      }
      if (spec) {
        setSpecs((curr) => ({ ...curr, [att.language]: spec }));
      }
      return { asset, spec };
    } catch {
      // Preview fetch failures stay local to the row; polling retries while in-flight.
      return undefined;
    } finally {
      if (loadGenerationRef.current[att.language] === requestId) {
        setLoading((curr) => ({ ...curr, [att.language]: false }));
      }
    }
  }, []);

  const handleRenderJobUpdated = useCallback(
    (lang: ExplanationLanguage, job: RenderJob) => {
      if (job.state === 'SUCCEEDED' && job.videoAssetId) {
        const existing = videosRef.current.find((v) => v.language === lang);
        if (existing && existing.videoAssetId !== job.videoAssetId) {
          const nextVideos = videosRef.current.filter((v) => v.language !== lang);
          nextVideos.push({
            language: lang,
            sceneSpecificationId: existing.sceneSpecificationId ?? null,
            videoAssetId: job.videoAssetId,
          });
          videosRef.current = nextVideos;
          onChangeRef.current(nextVideos);
          onDurabilityCommitRef.current?.(nextVideos);
          void loadAttachmentData({
            language: lang,
            sceneSpecificationId: existing.sceneSpecificationId ?? null,
            videoAssetId: job.videoAssetId,
          });
        }
      }
    },
    [loadAttachmentData],
  );

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      for (const att of videosRef.current) {
        if (cancelled) return;
        const loaded = await loadAttachmentData(att);
        if (cancelled || !loaded?.spec?.latestRenderJob) continue;
        handleRenderJobUpdated(att.language, loaded.spec.latestRenderJob);
      }
    };

    void refresh();

    const timer = window.setInterval(() => {
      const shouldPoll = videosRef.current.some((att) => {
        const asset = assetsRef.current[att.language];
        const spec = specsRef.current[att.language];
        if (att.videoAssetId && (!asset || asset.status === 'AWAITING_VALIDATION')) {
          return true;
        }
        const job = spec?.latestRenderJob;
        return Boolean(job && (job.state === 'QUEUED' || job.state === 'RUNNING'));
      });
      if (shouldPoll) void refresh();
    }, VALIDATION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // videoKey captures attachment identity without depending on a fresh [] each render.
  }, [videoKey, loadAttachmentData, handleRenderJobUpdated]);

  const handleUploadSuccess = (lang: ExplanationLanguage, asset: AcademicVideoAsset) => {
    setUploaderLang(null);
    setAssets((curr) => ({ ...curr, [lang]: asset }));
    const nextVideos = videosRef.current.filter((v) => v.language !== lang);
    nextVideos.push({
      language: lang,
      videoAssetId: asset.id,
      sceneSpecificationId: null,
    });
    applyVideos(nextVideos, true);
  };

  const handleScriptSaved = (lang: ExplanationLanguage, savedSpec: SceneSpecification) => {
    setSpecs((curr) => ({ ...curr, [lang]: savedSpec }));
    const existing = videosRef.current.find((v) => v.language === lang);
    if (!existing || existing.sceneSpecificationId !== savedSpec.id) {
      const nextVideos = videosRef.current.filter((v) => v.language !== lang);
      nextVideos.push({
        language: lang,
        sceneSpecificationId: savedSpec.id,
        videoAssetId: existing?.videoAssetId ?? null,
      });
      applyVideos(nextVideos, true);
    }
  };

  const handleJobEnqueued = () => {
    onDurabilityCommitRef.current?.(videosRef.current);
  };

  const handleRemoveAttachment = (lang: ExplanationLanguage) => {
    if (disabled) return;
    const nextVideos = videosRef.current.filter((v) => v.language !== lang);
    applyVideos(nextVideos, true);
    setAssets((curr) => {
      const next = { ...curr };
      delete next[lang];
      return next;
    });
    setSpecs((curr) => {
      const next = { ...curr };
      delete next[lang];
      return next;
    });
  };

  const handleRetryValidation = async (lang: ExplanationLanguage, assetId: string) => {
    if (retryingId || disabled) return;
    setRetryingId(assetId);
    setActionError(null);
    try {
      await retryAcademicVideoValidation(assetId);
      const updatedAsset = await getAcademicVideo(assetId);
      setAssets((curr) => ({ ...curr, [lang]: updatedAsset }));
    } catch (err) {
      if (err instanceof ApiError) {
        const problem = err.problem as { code?: string; detail?: string } | undefined;
        if (err.statusCode === 409 && problem?.code === 'VALIDATION_NOT_RETRYABLE') {
          setActionError(t('admin.academic.video.validationNotRetryable'));
        } else if (err.statusCode === 409 && problem?.code === 'RENDER_JOB_ACTIVE') {
          setActionError(t('admin.academic.video.validationJobActive'));
        } else {
          setActionError(problem?.detail || err.message);
        }
      } else if (err instanceof Error) {
        setActionError(err.message);
      }
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <fieldset className="admin-fieldset admin-stack-sm" disabled={disabled}>
      <legend className="admin-fieldset-legend">{t('admin.academic.video.title')}</legend>
      <p className="admin-hint">{t('admin.academic.video.subtitle')}</p>

      {actionError ? (
        <div className="state-notice state-notice-error" role="alert">
          <p>{actionError}</p>
        </div>
      ) : null}

      <div className="admin-stack-sm">
        {EXPLANATION_LANGUAGES.map((lang) => {
          const att = videos.find((v) => v.language === lang);
          const asset = assets[lang];
          const spec = specs[lang];
          const isLoading = loading[lang];
          const hasAttachment = Boolean(att);

          return (
            <div key={lang} className="admin-card admin-stack-sm">
              <div className="admin-row-between">
                <div className="admin-row-wrap">
                  <span className="font-semibold text-sm">
                    {t('admin.academic.video.attachHeading', { language: lang })}
                  </span>
                  {asset ? <VideoStatusBadge status={asset.status} /> : null}
                </div>

                {hasAttachment ? (
                  <div className="admin-row-wrap">
                    {asset?.status === 'DRAFT' || asset?.status === 'REVIEWED' ? (
                      <button
                        type="button"
                        className="btn-secondary admin-btn-compact-md"
                        onClick={() => {
                          setReviewAssetId(asset.id);
                          setReviewLang(lang);
                        }}
                        disabled={disabled}
                      >
                        <Film size={16} />
                        {t('admin.academic.video.reviewVideo')}
                      </button>
                    ) : null}

                    {att?.sceneSpecificationId ? (
                      <button
                        type="button"
                        className="btn-secondary admin-btn-compact-md"
                        onClick={() => {
                          setScriptEditorSpecId(att.sceneSpecificationId ?? null);
                          setScriptEditorLang(lang);
                        }}
                        disabled={disabled}
                      >
                        <Edit2 size={16} />
                        {t('admin.academic.video.editScript')}
                      </button>
                    ) : null}

                    <AdminRemoveButton
                      label={t('admin.academic.video.removeVideo')}
                      disabled={disabled}
                      onClick={() => setConfirmDeleteLang(lang)}
                    />
                  </div>
                ) : null}
              </div>

              {isLoading ? (
                <p className="admin-muted text-xs">{t('learn.loading')}</p>
              ) : !hasAttachment ? (
                <div className="admin-stack-tight">
                  <p className="admin-muted text-xs">{t('admin.academic.video.noVideo')}</p>
                  <div className="admin-equal-actions" data-count="2">
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact-md"
                      onClick={() => setUploaderLang(lang)}
                      disabled={disabled}
                    >
                      <Upload size={16} />
                      {t('admin.academic.video.uploadFinished')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact-md"
                      onClick={() => {
                        setScriptEditorSpecId(null);
                        setScriptEditorLang(lang);
                      }}
                      disabled={disabled}
                    >
                      <Video size={16} />
                      {t('admin.academic.video.authorScript')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-stack-tight">
                  {asset ? (
                    <div className="admin-row-wrap">
                      <span className="yukcsca-tag yukcsca-tag-neutral">
                        {t(`admin.academic.video.source.${asset.source}`)}
                      </span>
                      <span className="yukcsca-tag yukcsca-tag-neutral">
                        {t('admin.academic.video.duration', {
                          seconds: asset.durationSeconds ?? 0,
                        })}
                      </span>
                      <span className="yukcsca-tag yukcsca-tag-neutral">
                        {t('admin.academic.video.dimensions', {
                          width: asset.width ?? 0,
                          height: asset.height ?? 0,
                        })}
                      </span>
                    </div>
                  ) : null}

                  {asset?.status === 'AWAITING_VALIDATION' ? (
                    <div className="state-notice state-notice-warning">
                      <div className="admin-row-wrap">
                        <span>{t('admin.academic.video.status.AWAITING_VALIDATION')}</span>
                        {asset.latestValidationJob?.state === 'FAILED' ? (
                          <button
                            type="button"
                            className="btn-secondary admin-btn-compact-md"
                            onClick={() => handleRetryValidation(lang, asset.id)}
                            disabled={retryingId === asset.id || disabled}
                          >
                            <RefreshCw size={14} />
                            {t('admin.academic.video.retryValidation')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {asset?.status === 'REJECTED' && asset.rejection ? (
                    <div className="state-notice state-notice-error">
                      <strong>{t('admin.academic.video.uploader.rejectionTitle')}:</strong>
                      <ul>
                        {asset.rejection.map((rej, ri) => (
                          <li key={ri}>
                            {rej.code} ({rej.path})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {spec && !asset ? (
                    <div className="admin-row-wrap">
                      <span className="yukcsca-tag yukcsca-tag-info">
                        {t('admin.academic.video.source.PRODUCED')}
                      </span>
                      <span className="yukcsca-tag yukcsca-tag-neutral">
                        {t('admin.academic.video.segmentCount', {
                          count: spec.segments?.length || 0,
                        })}
                      </span>
                      {spec.latestRenderJob ? (
                        <span
                          className={`yukcsca-tag ${jobStateTagClass(spec.latestRenderJob.state)}`}
                        >
                          {t('admin.academic.video.jobState.' + spec.latestRenderJob.state)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {confirmDeleteLang ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-video-title"
          onClick={() => setConfirmDeleteLang(null)}
        >
          <div className="modal-content admin-stack-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="confirm-delete-video-title" className="admin-detail-title">
                {t('admin.academic.video.removeVideo')}
              </h3>
              <button
                type="button"
                className="btn-secondary admin-btn-icon"
                aria-label={t('admin.academic.video.scriptEditor.close')}
                title={t('admin.academic.video.scriptEditor.close')}
                onClick={() => setConfirmDeleteLang(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="modal-body-text">
              {t('admin.academic.video.removeConfirm', {
                language: confirmDeleteLang,
              })}
            </p>

            <div className="admin-actions-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDeleteLang(null)}
                disabled={disabled}
              >
                {t('admin.academic.video.uploader.cancel')}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  const lang = confirmDeleteLang;
                  setConfirmDeleteLang(null);
                  handleRemoveAttachment(lang);
                }}
                disabled={disabled}
              >
                {t('admin.academic.video.removeVideo')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploaderLang ? (
        <VideoUploader
          explanationLanguage={uploaderLang}
          onSuccess={(asset) => handleUploadSuccess(uploaderLang, asset)}
          onCancel={() => setUploaderLang(null)}
          disabled={disabled}
        />
      ) : null}

      {scriptEditorLang ? (
        <ScriptEditor
          explanationLanguage={scriptEditorLang}
          initialSpecId={scriptEditorSpecId}
          onSaved={(savedSpec) => handleScriptSaved(scriptEditorLang, savedSpec)}
          onJobUpdated={(job) => handleRenderJobUpdated(scriptEditorLang, job)}
          onJobEnqueued={handleJobEnqueued}
          onClose={() => {
            setScriptEditorLang(null);
            setScriptEditorSpecId(null);
          }}
          disabled={disabled}
        />
      ) : null}

      {reviewAssetId && reviewLang ? (
        <DraftVideoReview
          videoAssetId={reviewAssetId}
          explanationLanguage={reviewLang}
          onReviewed={(reviewedAsset) => {
            setAssets((curr) => ({ ...curr, [reviewLang]: reviewedAsset }));
          }}
          onClose={() => {
            setReviewAssetId(null);
            setReviewLang(null);
          }}
          disabled={disabled}
        />
      ) : null}
    </fieldset>
  );
}
