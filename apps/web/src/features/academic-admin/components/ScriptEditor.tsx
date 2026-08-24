import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { KaTeXPreview } from './KaTeXPreview';
import { AdminInlineLatexPreview } from './AdminInlineLatexPreview';
import {
  createRenderJob,
  createSceneSpecification,
  getRenderJob,
  getSceneSpecification,
  listSceneTemplates,
  replaceSceneSpecification,
  ApiError,
} from '../api/academicAdminApi';
import type {
  AcademicValidationViolation,
  ExplanationLanguage,
  RenderJob,
  SceneSegment,
  SceneSpecification,
  SceneTemplateRegistry,
} from '../types';

interface ScriptEditorProps {
  explanationLanguage: ExplanationLanguage;
  initialSpecId?: string | null;
  onSaved: (spec: SceneSpecification) => void;
  onJobUpdated?: (job: RenderJob) => void;
  /** Fired once after enqueue (or 409 active-job recovery), not on later poll ticks. */
  onJobEnqueued?: () => void;
  onClose: () => void;
  disabled?: boolean;
}

export function ScriptEditor({
  explanationLanguage,
  initialSpecId,
  onSaved,
  onJobUpdated,
  onJobEnqueued,
  onClose,
  disabled = false,
}: ScriptEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [registry, setRegistry] = useState<SceneTemplateRegistry | null>(null);
  const [spec, setSpec] = useState<SceneSpecification | null>(null);
  const [segments, setSegments] = useState<SceneSegment[]>([]);
  const [activeJob, setActiveJob] = useState<RenderJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState<AcademicValidationViolation[]>([]);
  const pollTimerRef = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await listSceneTemplates();
      setRegistry(reg);

      if (initialSpecId) {
        const loadedSpec = await getSceneSpecification(initialSpecId);
        setSpec(loadedSpec);
        setSegments(loadedSpec.segments || []);
        if (loadedSpec.latestRenderJob) {
          setActiveJob(loadedSpec.latestRenderJob);
        }
      } else {
        // Default initial segment
        const defaultAction = reg.actions[0];
        if (defaultAction) {
          setSegments([
            {
              templateActionId: defaultAction.id,
              params: {},
              narrationText: '',
            },
          ]);
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
  }, [initialSpecId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onJobUpdatedRef = useRef(onJobUpdated);
  useEffect(() => {
    onJobUpdatedRef.current = onJobUpdated;
  }, [onJobUpdated]);

  // Poll active render job
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const job = await getRenderJob(jobId);
      setActiveJob(job);
      onJobUpdatedRef.current?.(job);

      if (job.state === 'QUEUED' || job.state === 'RUNNING') {
        pollTimerRef.current = window.setTimeout(() => void pollJob(jobId), 3000);
      } else {
        setRendering(false);
      }
    } catch {
      // If poll fails, keep polling until terminal
      pollTimerRef.current = window.setTimeout(() => void pollJob(jobId), 5000);
    }
  }, []);

  useEffect(() => {
    if (activeJob && (activeJob.state === 'QUEUED' || activeJob.state === 'RUNNING')) {
      setRendering(true);
      clearPoll();
      pollTimerRef.current = window.setTimeout(() => void pollJob(activeJob.id), 2000);
    }
  }, [activeJob, pollJob]);

  const handleAddSegment = () => {
    if (!registry || disabled) return;
    const defaultAction = registry.actions[0];
    if (!defaultAction) return;

    setSegments((prev) => [
      ...prev,
      {
        templateActionId: defaultAction.id,
        params: {},
        narrationText: '',
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    if (disabled) return;
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    setSegments((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const temp = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleActionChange = (index: number, actionId: string) => {
    setSegments((prev) => {
      const next = [...prev];
      const seg = next[index];
      if (!seg) return prev;
      next[index] = {
        ...seg,
        templateActionId: actionId,
        params: {}, // reset params on action type change
      };
      return next;
    });
  };

  const handleParamChange = (index: number, paramId: string, value: unknown) => {
    setSegments((prev) => {
      const next = [...prev];
      const seg = next[index];
      if (!seg) return prev;
      const nextParams = { ...(seg.params as Record<string, unknown>), [paramId]: value };
      next[index] = {
        ...seg,
        params: nextParams,
      };
      return next;
    });
  };

  const handleNarrationChange = (index: number, text: string) => {
    setSegments((prev) => {
      const next = [...prev];
      const seg = next[index];
      if (!seg) return prev;
      next[index] = {
        ...seg,
        narrationText: text,
      };
      return next;
    });
  };

  const saveScript = async (): Promise<SceneSpecification | null> => {
    setSaving(true);
    setError(null);
    setViolations([]);

    try {
      let savedSpec: SceneSpecification;
      if (spec?.id) {
        savedSpec = await replaceSceneSpecification(spec.id, {
          explanationLanguage,
          segments,
        });
      } else {
        savedSpec = await createSceneSpecification({
          explanationLanguage,
          segments,
        });
      }
      setSpec(savedSpec);
      onSaved(savedSpec);
      return savedSpec;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 400 && err.problem && 'violations' in err.problem) {
          const viols = (err.problem as { violations?: AcademicValidationViolation[] }).violations;
          if (viols && Array.isArray(viols)) {
            setViolations(viols);
          }
        }
        setError(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('learn.errors.title'));
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    await saveScript();
  };

  const handleStartRender = async () => {
    if (rendering || saving || disabled) return;

    // 1. Save spec first
    const savedSpec = await saveScript();
    if (!savedSpec) return;

    setRendering(true);
    setError(null);

    try {
      const job = await createRenderJob(savedSpec.id);
      setActiveJob(job);
      onJobUpdated?.(job);
      onJobEnqueued?.();
      clearPoll();
      pollTimerRef.current = window.setTimeout(() => void pollJob(job.id), 2000);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        // 409 RENDER_JOB_ACTIVE: problem has active job
        const conflictProblem = err.problem as { job?: RenderJob };
        if (conflictProblem?.job) {
          setActiveJob(conflictProblem.job);
          onJobUpdated?.(conflictProblem.job);
          onJobEnqueued?.();
          pollTimerRef.current = window.setTimeout(
            () => void pollJob(conflictProblem.job!.id),
            2000,
          );
          return;
        }
      }
      if (err instanceof ApiError) {
        setError(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('learn.errors.title'));
      }
      setRendering(false);
    }
  };

  const getSegmentViolations = (index: number) => {
    return violations.filter(
      (v) => v.path === `segments[${index}]` || v.path.startsWith(`segments[${index}].`),
    );
  };

  const isStale =
    spec &&
    activeJob &&
    activeJob.state === 'SUCCEEDED' &&
    new Date(spec.updatedAt).getTime() > new Date(activeJob.createdAt).getTime();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !rendering) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving, rendering]);

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-editor-title"
    >
      <div className="admin-modal-card admin-modal-card-lg admin-stack-md">
        <div className="admin-row-between">
          <div>
            <h3 id="script-editor-title" className="admin-detail-title">
              {t('admin.academic.video.scriptEditor.title', {
                language: explanationLanguage,
              })}
            </h3>
            <p className="admin-hint">{t('admin.academic.video.scriptEditor.subtitle')}</p>
          </div>
          <button
            type="button"
            className="btn-quiet admin-btn-compact"
            onClick={onClose}
            disabled={saving}
          >
            {t('admin.academic.video.scriptEditor.close')}
          </button>
        </div>

        {error ? (
          <div className="state-notice state-notice-error" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        {isStale ? (
          <div className="state-notice state-notice-warning" role="status">
            <p>{t('admin.academic.video.scriptEditor.staleWarning')}</p>
          </div>
        ) : null}

        {activeJob ? (
          <div className="admin-card admin-stack-tight" role="status">
            <div className="admin-row-between">
              <span className="admin-field-label">
                {t('admin.academic.video.jobState.' + activeJob.state)}
              </span>
              <span className="admin-hint">
                {t('admin.academic.video.scriptEditor.jobAttempts', {
                  current: activeJob.attempts,
                  max: 3,
                })}
              </span>
            </div>
            {activeJob.error ? (
              <p className="state-notice state-notice-error">
                {activeJob.error.detail || activeJob.error.code}
              </p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="admin-muted">{t('learn.loading')}</p>
        ) : (
          <div className="admin-stack-md">
            {segments.length === 0 ? (
              <p className="admin-muted">{t('admin.academic.video.scriptEditor.emptySegments')}</p>
            ) : (
              <div className="admin-stack-md">
                {segments.map((segment, index) => {
                  const segViolations = getSegmentViolations(index);
                  const selectedAction = registry?.actions.find(
                    (a) => a.id === segment.templateActionId,
                  );
                  const paramsMap = (segment.params || {}) as Record<string, unknown>;

                  return (
                    <div
                      key={index}
                      className={`admin-card admin-stack-sm ${
                        segViolations.length > 0 ? 'admin-card-invalid' : ''
                      }`}
                    >
                      <div className="admin-row-between">
                        <span className="yukcsca-tag admin-tag-compact">
                          {t('admin.academic.video.scriptEditor.segmentNumber', {
                            index: index + 1,
                          })}
                        </span>
                        <div className="admin-row-wrap">
                          <button
                            type="button"
                            className="btn-quiet admin-btn-compact"
                            aria-label={t('admin.academic.video.scriptEditor.moveUp')}
                            onClick={() => handleMoveSegment(index, 'up')}
                            disabled={index === 0 || disabled}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-quiet admin-btn-compact"
                            aria-label={t('admin.academic.video.scriptEditor.moveDown')}
                            onClick={() => handleMoveSegment(index, 'down')}
                            disabled={index === segments.length - 1 || disabled}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-quiet admin-btn-compact text-danger"
                            aria-label={t('admin.academic.video.scriptEditor.removeSegment')}
                            onClick={() => handleRemoveSegment(index)}
                            disabled={disabled || segments.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {segViolations.map((v, vi) => (
                        <p key={vi} className="admin-field-error" role="alert">
                          {v.code} ({v.path})
                        </p>
                      ))}

                      {/* Template Action Selector */}
                      <div>
                        <label htmlFor={`seg-action-${index}`} className="admin-field-label">
                          {t('admin.academic.video.scriptEditor.actionLabel')}
                        </label>
                        <select
                          id={`seg-action-${index}`}
                          className="text-input admin-field-control"
                          value={segment.templateActionId}
                          disabled={disabled}
                          onChange={(e) => handleActionChange(index, e.target.value)}
                        >
                          {registry?.actions.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Structured Parameters */}
                      {selectedAction?.params.map((p) => {
                        const paramValue = paramsMap[p.id] ?? '';
                        return (
                          <div key={p.id} className="admin-stack-tight">
                            <label
                              htmlFor={`seg-${index}-param-${p.id}`}
                              className="admin-field-label"
                            >
                              {p.label || p.id}
                              {p.required ? <span className="admin-required"> *</span> : null}
                            </label>

                            {p.kind === 'STRING' ? (
                              <div className="admin-stack-tight">
                                <input
                                  id={`seg-${index}-param-${p.id}`}
                                  type="text"
                                  className="text-input admin-field-control"
                                  value={String(paramValue)}
                                  maxLength={p.maxLength ?? undefined}
                                  placeholder={t(
                                    'admin.academic.video.scriptEditor.inlineLatexPlaceholder',
                                  )}
                                  disabled={disabled}
                                  onChange={(e) => handleParamChange(index, p.id, e.target.value)}
                                />
                                <p className="admin-hint">{t('content.inlineLatexHint')}</p>
                                <AdminInlineLatexPreview text={String(paramValue)} />
                              </div>
                            ) : p.kind === 'MULTILINE_TEXT' ? (
                              <div className="admin-stack-tight">
                                <textarea
                                  id={`seg-${index}-param-${p.id}`}
                                  className="text-input admin-field-control admin-textarea-compact"
                                  value={String(paramValue)}
                                  maxLength={p.maxLength ?? undefined}
                                  rows={3}
                                  placeholder={t(
                                    'admin.academic.video.scriptEditor.inlineLatexPlaceholder',
                                  )}
                                  disabled={disabled}
                                  onChange={(e) => handleParamChange(index, p.id, e.target.value)}
                                />
                                <p className="admin-hint">{t('content.inlineLatexHint')}</p>
                                <AdminInlineLatexPreview text={String(paramValue)} />
                              </div>
                            ) : p.kind === 'INTEGER' ? (
                              <input
                                id={`seg-${index}-param-${p.id}`}
                                type="number"
                                step="1"
                                min={p.min ?? undefined}
                                max={p.max ?? undefined}
                                className="text-input admin-field-control"
                                value={paramValue !== '' ? Number(paramValue) : ''}
                                disabled={disabled}
                                onChange={(e) =>
                                  handleParamChange(
                                    index,
                                    p.id,
                                    e.target.value ? parseInt(e.target.value, 10) : 0,
                                  )
                                }
                              />
                            ) : p.kind === 'DECIMAL' ? (
                              <input
                                id={`seg-${index}-param-${p.id}`}
                                type="number"
                                step="any"
                                min={p.min ?? undefined}
                                max={p.max ?? undefined}
                                className="text-input admin-field-control"
                                value={paramValue !== '' ? Number(paramValue) : ''}
                                disabled={disabled}
                                onChange={(e) =>
                                  handleParamChange(
                                    index,
                                    p.id,
                                    e.target.value ? parseFloat(e.target.value) : 0,
                                  )
                                }
                              />
                            ) : p.kind === 'MATH_EXPRESSION' ? (
                              <div className="admin-stack-tight">
                                <input
                                  id={`seg-${index}-param-${p.id}`}
                                  type="text"
                                  className="text-input admin-field-control"
                                  value={String(paramValue)}
                                  maxLength={p.maxLength ?? undefined}
                                  placeholder={t(
                                    'admin.academic.video.scriptEditor.mathPlaceholder',
                                  )}
                                  disabled={disabled}
                                  onChange={(e) => handleParamChange(index, p.id, e.target.value)}
                                />
                                <p className="admin-hint">
                                  {t('admin.academic.blocks.latexSafetyHint')}
                                </p>
                                {String(paramValue).includes('<') ||
                                String(paramValue).includes('>') ? (
                                  <p className="admin-field-error" role="status">
                                    {t('admin.academic.blocks.latexAngleBracketWarning')}
                                  </p>
                                ) : null}
                                {paramValue ? (
                                  <KaTeXPreview latex={String(paramValue)} displayMode />
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                      {/* Narration text */}
                      <div>
                        <div className="admin-row-between">
                          <label htmlFor={`seg-${index}-narration`} className="admin-field-label">
                            {t('admin.academic.video.scriptEditor.narrationLabel')}
                            <span className="admin-required"> *</span>
                          </label>
                          <span className="admin-hint">
                            {t('admin.academic.video.scriptEditor.narrationCharCount', {
                              count: segment.narrationText.length,
                            })}
                          </span>
                        </div>
                        <textarea
                          id={`seg-${index}-narration`}
                          className="text-input admin-field-control"
                          rows={2}
                          maxLength={600}
                          placeholder={t('admin.academic.video.scriptEditor.narrationPlaceholder')}
                          value={segment.narrationText}
                          disabled={disabled}
                          onChange={(e) => handleNarrationChange(index, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddSegment}
                  disabled={disabled}
                >
                  <Plus size={16} />
                  {t('admin.academic.video.scriptEditor.addSegment')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="admin-row-between">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveOnly}
            disabled={saving || rendering || disabled}
          >
            {saving
              ? t('learn.lesson.savingProgress')
              : t('admin.academic.video.scriptEditor.saveScript')}
          </button>
          <div className="admin-row-wrap">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              {t('admin.academic.video.scriptEditor.close')}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartRender}
              disabled={saving || rendering || disabled || segments.length === 0}
              aria-busy={rendering}
            >
              {rendering
                ? t('admin.academic.video.scriptEditor.rendering')
                : isStale
                  ? t('admin.academic.video.scriptEditor.reRender')
                  : t('admin.academic.video.scriptEditor.renderVideo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
