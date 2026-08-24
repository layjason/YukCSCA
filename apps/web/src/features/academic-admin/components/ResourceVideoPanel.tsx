import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Film, RefreshCw, Trash2, Upload, Video } from 'lucide-react';
import { VideoStatusBadge } from './VideoStatusBadge';
import { VideoUploader } from './VideoUploader';
import { ScriptEditor } from './ScriptEditor';
import { DraftVideoReview } from './DraftVideoReview';
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
  disabled?: boolean;
}

const EXPLANATION_LANGUAGES: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];

export function ResourceVideoPanel({
  videos = [],
  onChange,
  disabled = false,
}: ResourceVideoPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Record<string, AcademicVideoAsset>>({});
  const [specs, setSpecs] = useState<Record<string, SceneSpecification>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal dialog states
  const [uploaderLang, setUploaderLang] = useState<ExplanationLanguage | null>(null);
  const [scriptEditorLang, setScriptEditorLang] = useState<ExplanationLanguage | null>(null);
  const [scriptEditorSpecId, setScriptEditorSpecId] = useState<string | null>(null);
  const [reviewAssetId, setReviewAssetId] = useState<string | null>(null);
  const [reviewLang, setReviewLang] = useState<ExplanationLanguage | null>(null);

  const loadAttachmentData = useCallback(async (att: ResourceVideoAttachment) => {
    setLoading((curr) => ({ ...curr, [att.language]: true }));
    try {
      if (att.videoAssetId) {
        const asset = await getAcademicVideo(att.videoAssetId);
        setAssets((curr) => ({ ...curr, [att.language]: asset }));
      }
      if (att.sceneSpecificationId) {
        const spec = await getSceneSpecification(att.sceneSpecificationId);
        setSpecs((curr) => ({ ...curr, [att.language]: spec }));
      }
    } catch {
      // Ignored for individual preview fetch errors
    } finally {
      setLoading((curr) => ({ ...curr, [att.language]: false }));
    }
  }, []);

  useEffect(() => {
    for (const att of videos) {
      void loadAttachmentData(att);
    }
  }, [videos, loadAttachmentData]);

  const handleUploadSuccess = (lang: ExplanationLanguage, asset: AcademicVideoAsset) => {
    setUploaderLang(null);
    setAssets((curr) => ({ ...curr, [lang]: asset }));
    // Update attachment in draft
    const nextVideos = videos.filter((v) => v.language !== lang);
    nextVideos.push({
      language: lang,
      videoAssetId: asset.id,
      sceneSpecificationId: null,
    });
    onChange(nextVideos);
  };

  const handleScriptSaved = (lang: ExplanationLanguage, savedSpec: SceneSpecification) => {
    setSpecs((curr) => ({ ...curr, [lang]: savedSpec }));
    // If not in videos, add it
    const existing = videos.find((v) => v.language === lang);
    if (!existing || existing.sceneSpecificationId !== savedSpec.id) {
      const nextVideos = videos.filter((v) => v.language !== lang);
      nextVideos.push({
        language: lang,
        sceneSpecificationId: savedSpec.id,
        videoAssetId: existing?.videoAssetId ?? null,
      });
      onChange(nextVideos);
    }
  };

  const handleRenderJobUpdated = (lang: ExplanationLanguage, job: RenderJob) => {
    if (job.state === 'SUCCEEDED' && job.videoAssetId) {
      // Succeeded produced video! Add videoAssetId to draft attachment
      const existing = videos.find((v) => v.language === lang);
      if (existing && existing.videoAssetId !== job.videoAssetId) {
        const nextVideos = videos.filter((v) => v.language !== lang);
        nextVideos.push({
          language: lang,
          sceneSpecificationId: existing.sceneSpecificationId ?? null,
          videoAssetId: job.videoAssetId,
        });
        onChange(nextVideos);
        void loadAttachmentData({
          language: lang,
          sceneSpecificationId: existing.sceneSpecificationId ?? null,
          videoAssetId: job.videoAssetId,
        });
      }
    }
  };

  const handleRemoveAttachment = (lang: ExplanationLanguage) => {
    if (disabled) return;
    const nextVideos = videos.filter((v) => v.language !== lang);
    onChange(nextVideos);
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
        setActionError(err.problem?.detail || err.message);
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
            <div key={lang} className="admin-card admin-stack-tight">
              <div className="admin-row-between">
                <div className="admin-row-wrap">
                  <span className="font-semibold text-sm">
                    {t('admin.academic.video.attachHeading', { language: lang })}
                  </span>
                  {asset ? <VideoStatusBadge status={asset.status} /> : null}
                </div>

                <div className="admin-row-wrap">
                  {hasAttachment ? (
                    <>
                      {asset?.status === 'DRAFT' || asset?.status === 'REVIEWED' ? (
                        <button
                          type="button"
                          className="btn-secondary admin-btn-compact"
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
                          className="btn-secondary admin-btn-compact"
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

                      <button
                        type="button"
                        className="btn-quiet admin-btn-compact text-danger"
                        aria-label={t('admin.academic.video.removeVideo')}
                        onClick={() => handleRemoveAttachment(lang)}
                        disabled={disabled}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {isLoading ? (
                <p className="admin-muted text-xs">{t('learn.loading')}</p>
              ) : !hasAttachment ? (
                <div className="admin-row-between">
                  <p className="admin-muted text-xs">{t('admin.academic.video.noVideo')}</p>
                  <div className="admin-row-wrap">
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact"
                      onClick={() => setUploaderLang(lang)}
                      disabled={disabled}
                    >
                      <Upload size={16} />
                      {t('admin.academic.video.uploadFinished')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact"
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
                <div className="admin-stack-tight text-xs admin-hint">
                  {asset ? (
                    <div className="admin-row-wrap">
                      <span>{t(`admin.academic.video.source.${asset.source}`)}</span>
                      <span>•</span>
                      <span>
                        {t('admin.academic.video.duration', {
                          seconds: asset.durationSeconds ?? 0,
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        {t('admin.academic.video.dimensions', {
                          width: asset.width ?? 0,
                          height: asset.height ?? 0,
                        })}
                      </span>
                    </div>
                  ) : null}

                  {asset?.status === 'AWAITING_VALIDATION' ? (
                    <div className="admin-row-between state-notice state-notice-warning">
                      <span>{t('admin.academic.video.status.AWAITING_VALIDATION')}</span>
                      {asset.latestValidationJob?.state === 'FAILED' ? (
                        <button
                          type="button"
                          className="btn-secondary admin-btn-compact"
                          onClick={() => handleRetryValidation(lang, asset.id)}
                          disabled={retryingId === asset.id || disabled}
                        >
                          <RefreshCw size={14} />
                          {t('admin.academic.video.retryValidation')}
                        </button>
                      ) : null}
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
                      <span>{t('admin.academic.video.source.PRODUCED')}</span>
                      <span>•</span>
                      <span>{spec.segments?.length || 0} segments</span>
                      {spec.latestRenderJob ? (
                        <span>
                          • {t('admin.academic.video.jobState.' + spec.latestRenderJob.state)}
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
