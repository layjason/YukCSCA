import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Edit2, X } from 'lucide-react';
import { VideoStatusBadge } from './VideoStatusBadge';
import {
  getAcademicVideo,
  getAcademicVideoCaptions,
  getAcademicVideoPlay,
  putAcademicVideoCaptions,
  reviewAcademicVideo,
  ApiError,
} from '../api/academicAdminApi';
import type { AcademicVideoAsset, ExplanationLanguage, VideoPlaybackGrant } from '../types';

interface DraftVideoReviewProps {
  videoAssetId: string;
  explanationLanguage: ExplanationLanguage;
  onReviewed: (asset: AcademicVideoAsset) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function DraftVideoReview({
  videoAssetId,
  explanationLanguage,
  onReviewed,
  onClose,
  disabled = false,
}: DraftVideoReviewProps): React.JSX.Element {
  const { t } = useTranslation();
  const [asset, setAsset] = useState<AcademicVideoAsset | null>(null);
  const [grant, setGrant] = useState<VideoPlaybackGrant | null>(null);
  const [vtt, setVtt] = useState<string>('');
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [editingVtt, setEditingVtt] = useState(false);
  const [vttDraft, setVttDraft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingVtt, setSavingVtt] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedAsset = await getAcademicVideo(videoAssetId);
      setAsset(loadedAsset);

      // Play grant
      try {
        const loadedGrant = await getAcademicVideoPlay(videoAssetId);
        setGrant(loadedGrant);
      } catch (err) {
        // May 404/409 if not playable yet
        if (err instanceof ApiError && err.statusCode === 409) {
          setError(
            err.problem?.detail || tRef.current('admin.academic.video.reviewModal.notPlayable'),
          );
        }
      }

      // Captions
      if (loadedAsset.captionsAvailable) {
        try {
          const loadedVtt = await getAcademicVideoCaptions(videoAssetId);
          setVtt(loadedVtt);
          setVttDraft(loadedVtt);
          const blob = new Blob([loadedVtt], { type: 'text/vtt' });
          const url = URL.createObjectURL(blob);
          setTrackUrl(url);
        } catch {
          // Captions load failure is non-blocking for draft inspection
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(tRef.current('learn.errors.title'));
      }
    } finally {
      setLoading(false);
    }
  }, [videoAssetId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (trackUrl) {
        URL.revokeObjectURL(trackUrl);
      }
    };
  }, [trackUrl]);

  const handleSaveCaptions = async () => {
    if (savingVtt || disabled) return;
    setSavingVtt(true);
    setError(null);

    try {
      const updatedAsset = await putAcademicVideoCaptions(videoAssetId, vttDraft);
      setAsset(updatedAsset);
      setVtt(vttDraft);
      setEditingVtt(false);
      if (trackUrl) URL.revokeObjectURL(trackUrl);
      const blob = new Blob([vttDraft], { type: 'text/vtt' });
      setTrackUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('learn.errors.title'));
      }
    } finally {
      setSavingVtt(false);
    }
  };

  const handleReview = async () => {
    if (reviewing || disabled) return;
    setReviewing(true);
    setError(null);

    try {
      const reviewedAsset = await reviewAcademicVideo(videoAssetId);
      setAsset(reviewedAsset);
      setSuccess(t('admin.academic.video.reviewModal.reviewedSuccess'));
      onReviewed(reviewedAsset);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setError(
            err.problem?.detail || t('admin.academic.video.reviewModal.reviewPreconditionError'),
          );
        } else {
          setError(err.problem?.detail || err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('learn.errors.title'));
      }
    } finally {
      setReviewing(false);
    }
  };

  const handleClose = async () => {
    if (reviewing || savingVtt) return;
    if (editingVtt && vttDraft !== vtt && asset && isUploadedDraft) {
      try {
        await putAcademicVideoCaptions(asset.id, vttDraft);
      } catch {
        // ignore caption save error on modal dismiss
      }
    }
    onClose();
  };

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void handleCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isUploadedDraft = asset?.source === 'UPLOADED' && asset.status === 'DRAFT';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-video-review-title"
      onClick={() => void handleClose()}
    >
      <div
        className="modal-content modal-content-lg admin-stack-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-row-between">
          <div className="admin-row-wrap">
            <h3 id="draft-video-review-title" className="admin-detail-title">
              {t('admin.academic.video.reviewModal.title', {
                language: explanationLanguage,
              })}
            </h3>
            {asset ? <VideoStatusBadge status={asset.status} /> : null}
          </div>
          <button
            type="button"
            className="btn-secondary admin-btn-icon"
            aria-label={t('admin.academic.video.reviewModal.close')}
            title={t('admin.academic.video.reviewModal.close')}
            onClick={() => void handleClose()}
          >
            <X size={16} />
          </button>
        </div>

        {error ? (
          <div className="state-notice state-notice-error" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="state-notice state-notice-success" role="status">
            <p>{success}</p>
          </div>
        ) : null}

        {loading ? (
          <p className="admin-muted">{t('learn.loading')}</p>
        ) : asset ? (
          <div className="admin-stack-md">
            {/* Player Preview */}
            <div className="admin-card admin-stack-sm">
              <h4 className="admin-sidebar-title">
                {t('admin.academic.video.reviewModal.playerHeading')}
              </h4>
              {grant ? (
                <div className="admin-video-player-container">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={grant.url}
                    className="admin-video-element"
                  >
                    {trackUrl ? (
                      <track
                        kind="captions"
                        src={trackUrl}
                        srcLang={explanationLanguage}
                        label={explanationLanguage}
                        default
                      />
                    ) : null}
                  </video>
                </div>
              ) : (
                <p className="admin-muted">{t('learn.lesson.video.playbackError')}</p>
              )}
              <div className="admin-row-wrap">
                <span className="yukcsca-tag yukcsca-tag-neutral">
                  {t('admin.academic.video.dimensions', {
                    width: asset.width,
                    height: asset.height,
                  })}
                </span>
                <span className="yukcsca-tag yukcsca-tag-neutral">
                  {t('admin.academic.video.duration', {
                    seconds: asset.durationSeconds,
                  })}
                </span>
                <span className="yukcsca-tag yukcsca-tag-info">
                  {t(`admin.academic.video.source.${asset.source}`)}
                </span>
              </div>
            </div>

            {/* Captions & Subtitles */}
            <div className="admin-card admin-stack-sm">
              <div className="admin-row-between">
                <h4 className="admin-sidebar-title">
                  {t('admin.academic.video.reviewModal.captionsHeading')}
                </h4>
                {isUploadedDraft && !editingVtt ? (
                  <button
                    type="button"
                    className="btn-secondary admin-btn-compact-md"
                    onClick={() => setEditingVtt(true)}
                    disabled={disabled}
                  >
                    <Edit2 size={16} />
                    {t('admin.academic.video.reviewModal.editCaptions')}
                  </button>
                ) : null}
              </div>

              {asset.source === 'PRODUCED' ? (
                <p className="admin-hint">
                  {t('admin.academic.video.reviewModal.captionsDerived')}
                </p>
              ) : null}

              {editingVtt ? (
                <div className="admin-stack-tight">
                  <textarea
                    className="text-input admin-field-control admin-vtt-editor"
                    rows={8}
                    value={vttDraft}
                    aria-label={t('admin.academic.video.reviewModal.captionsHeading')}
                    disabled={savingVtt || disabled}
                    onChange={(e) => setVttDraft(e.target.value)}
                  />
                  <div className="admin-actions-end">
                    <button
                      type="button"
                      className="btn-secondary admin-btn-compact-md"
                      onClick={() => {
                        setVttDraft(vtt);
                        setEditingVtt(false);
                      }}
                      disabled={savingVtt}
                    >
                      {t('admin.academic.video.uploader.cancel')}
                    </button>
                    <button
                      type="button"
                      className="btn-primary admin-btn-compact-md"
                      onClick={handleSaveCaptions}
                      disabled={savingVtt || disabled}
                    >
                      {savingVtt
                        ? t('learn.lesson.savingProgress')
                        : t('admin.academic.video.reviewModal.saveCaptions')}
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="admin-code-preview">
                  {vtt || t('admin.academic.video.reviewModal.noCaptions')}
                </pre>
              )}
            </div>

            {/* Provenance */}
            <div className="admin-card admin-stack-tight">
              <h4 className="admin-sidebar-title">
                {t('admin.academic.video.reviewModal.provenanceHeading')}
              </h4>
              <p className="admin-hint">
                <strong>{t('admin.academic.video.reviewModal.origin')}:</strong>{' '}
                {asset.provenance.origin}
                {asset.provenance.provider
                  ? ` • ${t('admin.academic.video.reviewModal.provider')}: ${asset.provenance.provider}`
                  : ''}
                {asset.provenance.sourceLocator
                  ? ` • ${t('admin.academic.video.reviewModal.locator')}: ${asset.provenance.sourceLocator}`
                  : ''}
              </p>
              {asset.provenance.permissionReference ? (
                <p className="admin-hint">
                  <strong>{t('admin.academic.video.reviewModal.permission')}:</strong>{' '}
                  {asset.provenance.permissionReference}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="admin-actions-end">
          <button type="button" className="btn-secondary" onClick={() => void handleClose()}>
            {t('admin.academic.video.reviewModal.close')}
          </button>
          {asset?.status === 'DRAFT' ? (
            <button
              type="button"
              className="btn-primary"
              onClick={handleReview}
              disabled={reviewing || disabled || !asset}
              aria-busy={reviewing}
            >
              <Check size={16} />
              {reviewing
                ? t('learn.lesson.savingProgress')
                : t('admin.academic.video.reviewModal.markReviewed')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
