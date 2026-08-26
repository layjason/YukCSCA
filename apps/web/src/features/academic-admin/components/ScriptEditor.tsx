import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useAdminNotify } from '../adminNotify';
import { KaTeXPreview } from './KaTeXPreview';
import { AdminInlineLatexPreview } from './AdminInlineLatexPreview';
import { AdminRemoveButton } from './AdminRemoveButton';
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
  SceneTemplateParamDescriptor,
  SceneTemplateRegistry,
} from '../types';

/**
 * Display-only rule from the descriptor's `visibleWhen`: a parameter is collected only while the
 * referenced ENUM parameter holds one of its choice tokens. A missing or empty controlling value
 * (placeholder still selected) hides the parameter. Server-side validation semantics are
 * unaffected; this only mirrors which params the editor presents and keeps in the wire payload.
 */
function isParamVisible(
  descriptor: SceneTemplateParamDescriptor,
  params: Record<string, unknown>,
): boolean {
  const rule = descriptor.visibleWhen;
  if (!rule) return true;
  const controllingValue = params[rule.paramId];
  return (
    typeof controllingValue === 'string' &&
    controllingValue !== '' &&
    rule.choices.includes(controllingValue)
  );
}

/**
 * Bounded composite size for INTERVAL_SET parameters (`number-line-union`), mirrored from the
 * reviewed registry validator so the editor cannot author a payload the server must reject.
 */
const MAX_INTERVAL_SCOPES = 4;

type IntervalEndToken = 'FINITE' | 'INFINITE';
type IntervalBoundToken = 'OPEN' | 'CLOSED';

/**
 * One interval scope of an INTERVAL_SET parameter. Fields of an INFINITE end are dropped at
 * change time (see `normalizeScope`) so stale endpoint/bound values are never submitted — the
 * same hygiene as the `visibleWhen` param prune. The wire shape is validated server-side.
 */
interface IntervalScope {
  leftInf: IntervalEndToken;
  rightInf: IntervalEndToken;
  left?: number;
  leftBound?: IntervalBoundToken;
  right?: number;
  rightBound?: IntervalBoundToken;
}

/** Reads an INTERVAL_SET parameter value off the untyped params boundary. */
function readIntervalScopes(value: unknown): IntervalScope[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is IntervalScope => typeof entry === 'object' && entry !== null,
  );
}

/**
 * Rebuilds one scope so only its applicable fields survive: an INFINITE end contributes only
 * its token, and every FINITE end always carries both endpoint and bound token. Guarantees no
 * partial or placeholder row is ever stored in `params`.
 */
function normalizeScope(scope: IntervalScope): IntervalScope {
  const normalized: IntervalScope = {
    leftInf: scope.leftInf === 'INFINITE' ? 'INFINITE' : 'FINITE',
    rightInf: scope.rightInf === 'INFINITE' ? 'INFINITE' : 'FINITE',
  };
  if (normalized.leftInf === 'FINITE') {
    normalized.left = typeof scope.left === 'number' ? scope.left : 0;
    normalized.leftBound = scope.leftBound === 'OPEN' ? 'OPEN' : 'CLOSED';
  }
  if (normalized.rightInf === 'FINITE') {
    normalized.right = typeof scope.right === 'number' ? scope.right : 0;
    normalized.rightBound = scope.rightBound === 'OPEN' ? 'OPEN' : 'CLOSED';
  }
  return normalized;
}

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
  // Background acknowledgement toasts; no-op unless an admin host provides the shared toast.
  const notify = useAdminNotify();
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
    notify(t('admin.academic.video.scriptEditor.toasts.segmentAdded'), 'success');
  };

  const handleRemoveSegment = (index: number) => {
    if (disabled) return;
    setSegments((prev) => prev.filter((_, i) => i !== index));
    notify(t('admin.academic.video.scriptEditor.toasts.segmentRemoved'), 'error');
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
      // Drop params whose display rule just became unsatisfied so hidden values are never
      // silently submitted (mirrors the full reset on action change), resolved from the
      // descriptors at change time rather than a hardcoded param map.
      const descriptors = registry?.actions.find((a) => a.id === seg.templateActionId)?.params;
      if (descriptors) {
        for (const p of descriptors) {
          if (p.id in nextParams && !isParamVisible(p, nextParams)) {
            delete nextParams[p.id];
          }
        }
      }
      next[index] = {
        ...seg,
        params: nextParams,
      };
      return next;
    });
  };

  /** Applies one transformation to an INTERVAL_SET value inside a segment's params. */
  const updateScopes = (
    segmentIndex: number,
    paramId: string,
    update: (prev: IntervalScope[]) => IntervalScope[],
  ) => {
    setSegments((prev) => {
      const next = [...prev];
      const seg = next[segmentIndex];
      if (!seg) return prev;
      const paramsMap = (seg.params ?? {}) as Record<string, unknown>;
      next[segmentIndex] = {
        ...seg,
        params: { ...paramsMap, [paramId]: update(readIntervalScopes(paramsMap[paramId])) },
      };
      return next;
    });
  };

  const handleAddScope = (segmentIndex: number, paramId: string) => {
    // A new row is born complete (bounded interval [0;0]) so no placeholder row can be saved.
    const freshScope: IntervalScope = {
      leftInf: 'FINITE',
      left: 0,
      leftBound: 'CLOSED',
      rightInf: 'FINITE',
      right: 0,
      rightBound: 'CLOSED',
    };
    updateScopes(segmentIndex, paramId, (prev) =>
      prev.length >= MAX_INTERVAL_SCOPES ? prev : [...prev, freshScope],
    );
  };

  const handleRemoveScope = (segmentIndex: number, paramId: string, scopeIndex: number) => {
    updateScopes(segmentIndex, paramId, (prev) =>
      prev.filter((_, i) => i !== scopeIndex).map(normalizeScope),
    );
  };

  /**
   * Switches one interval end between FINITE and INFINITE. An INFINITE end drops its endpoint
   * and bound fields immediately so hidden values are never submitted.
   */
  const handleScopeEndChange = (
    segmentIndex: number,
    paramId: string,
    scopeIndex: number,
    end: 'left' | 'right',
    token: IntervalEndToken,
  ) => {
    updateScopes(segmentIndex, paramId, (prev) => {
      const target = prev[scopeIndex];
      if (!target) return prev;
      const updated =
        end === 'left' ? { ...target, leftInf: token } : { ...target, rightInf: token };
      const next = [...prev];
      next[scopeIndex] = normalizeScope(updated);
      return next;
    });
  };

  const handleScopeNumberChange = (
    segmentIndex: number,
    paramId: string,
    scopeIndex: number,
    end: 'left' | 'right',
    text: string,
  ) => {
    const numeric = text === '' ? 0 : parseFloat(text);
    if (Number.isNaN(numeric)) return;
    updateScopes(segmentIndex, paramId, (prev) => {
      const target = prev[scopeIndex];
      if (!target) return prev;
      const updated = end === 'left' ? { ...target, left: numeric } : { ...target, right: numeric };
      const next = [...prev];
      next[scopeIndex] = normalizeScope(updated);
      return next;
    });
  };

  const handleScopeBoundChange = (
    segmentIndex: number,
    paramId: string,
    scopeIndex: number,
    end: 'left' | 'right',
    bound: string,
  ) => {
    if (bound !== 'OPEN' && bound !== 'CLOSED') return;
    updateScopes(segmentIndex, paramId, (prev) => {
      const target = prev[scopeIndex];
      if (!target) return prev;
      const updated: IntervalScope =
        end === 'left' ? { ...target, leftBound: bound } : { ...target, rightBound: bound };
      const next = [...prev];
      next[scopeIndex] = normalizeScope(updated);
      return next;
    });
  };

  /** One interval end of a scope row: end-type select plus its FINITE-only endpoint/bound pair. */
  const renderScopeEnd = (
    segmentIndex: number,
    paramId: string,
    scopeIndex: number,
    scope: IntervalScope,
    end: 'left' | 'right',
  ): React.JSX.Element => {
    const infToken = end === 'left' ? scope.leftInf : scope.rightInf;
    const numberValue = end === 'left' ? scope.left : scope.right;
    const boundValue = (end === 'left' ? scope.leftBound : scope.rightBound) ?? 'CLOSED';
    const idPrefix = `seg-${segmentIndex}-param-${paramId}-${scopeIndex}-${end}`;
    const endTypeLabel = t(
      end === 'left'
        ? 'admin.academic.video.scriptEditor.scopeLeftEndType'
        : 'admin.academic.video.scriptEditor.scopeRightEndType',
    );
    const endpointLabel = t(
      end === 'left'
        ? 'admin.academic.video.scriptEditor.scopeLeftEndpoint'
        : 'admin.academic.video.scriptEditor.scopeRightEndpoint',
    );
    const boundLabel = t(
      end === 'left'
        ? 'admin.academic.video.scriptEditor.scopeLeftBoundType'
        : 'admin.academic.video.scriptEditor.scopeRightBoundType',
    );
    return (
      <div className="admin-stack-tight">
        <label htmlFor={`${idPrefix}-inf`} className="admin-field-label">
          {endTypeLabel}
        </label>
        <select
          id={`${idPrefix}-inf`}
          className="text-input admin-field-control"
          value={infToken}
          disabled={disabled}
          onChange={(e) =>
            handleScopeEndChange(
              segmentIndex,
              paramId,
              scopeIndex,
              end,
              e.target.value as IntervalEndToken,
            )
          }
        >
          <option value="FINITE">{t('admin.academic.video.scriptEditor.scopeFinite')}</option>
          <option value="INFINITE">{t('admin.academic.video.scriptEditor.scopeInfinite')}</option>
        </select>
        {infToken === 'FINITE' ? (
          <div className="admin-row-wrap">
            <div className="admin-stack-tight">
              <label htmlFor={`${idPrefix}-number`} className="admin-field-label">
                {endpointLabel}
              </label>
              <input
                id={`${idPrefix}-number`}
                type="number"
                step="any"
                className="text-input admin-field-control"
                value={typeof numberValue === 'number' ? numberValue : ''}
                disabled={disabled}
                onChange={(e) =>
                  handleScopeNumberChange(segmentIndex, paramId, scopeIndex, end, e.target.value)
                }
              />
            </div>
            <div className="admin-stack-tight">
              <label htmlFor={`${idPrefix}-bound`} className="admin-field-label">
                {boundLabel}
              </label>
              <select
                id={`${idPrefix}-bound`}
                className="text-input admin-field-control"
                value={boundValue}
                disabled={disabled}
                onChange={(e) =>
                  handleScopeBoundChange(segmentIndex, paramId, scopeIndex, end, e.target.value)
                }
              >
                <option value="OPEN">{t('admin.academic.video.scriptEditor.scopeOpen')}</option>
                <option value="CLOSED">{t('admin.academic.video.scriptEditor.scopeClosed')}</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>
    );
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
      notify(t('admin.academic.video.scriptEditor.toasts.saved'), 'success');
      return savedSpec;
    } catch (err) {
      // Failure toast accompanies — never replaces — the inline error and violation display.
      notify(t('admin.academic.video.scriptEditor.toasts.saveFailed'), 'error');
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

  /** Parses the row index out of an INTERVAL_SET violation path, e.g. `...scopes[1].leftBound`. */
  const scopeRowOfPath = (path: string, basePath: string): number | null => {
    if (!path.startsWith(`${basePath}[`)) return null;
    const rest = path.slice(basePath.length + 1);
    const closeIndex = rest.indexOf(']');
    if (closeIndex < 0) return null;
    const rowIndex = Number.parseInt(rest.slice(0, closeIndex), 10);
    return Number.isNaN(rowIndex) ? null : rowIndex;
  };

  /**
   * Segment-level violations minus the ones already rendered inside their INTERVAL_SET scope
   * rows (array-level and in-range row paths). Out-of-range rows have no editor card to host
   * them, so they intentionally stay at segment level.
   */
  const getUnmappedSegmentViolations = (index: number) => {
    const segViolations = getSegmentViolations(index);
    const paramsMap = (segments[index]?.params ?? {}) as Record<string, unknown>;
    const intervalParamIds = (registry?.actions ?? [])
      .find((a) => a.id === segments[index]?.templateActionId)
      ?.params.filter((p) => p.kind === 'INTERVAL_SET')
      .map((p) => p.id);
    if (!intervalParamIds?.length) return segViolations;
    return segViolations.filter((v) =>
      intervalParamIds.every((paramId) => {
        const basePath = `segments[${index}].params.${paramId}`;
        if (v.path === basePath) return false;
        const row = scopeRowOfPath(v.path, basePath);
        return row === null || row >= readIntervalScopes(paramsMap[paramId]).length;
      }),
    );
  };

  /** Array-level violations for one INTERVAL_SET parameter (e.g. empty or over the cap). */
  const getScopeArrayViolations = (index: number, paramId: string) => {
    const basePath = `segments[${index}].params.${paramId}`;
    return violations.filter((v) => v.path === basePath);
  };

  /** Row-level violations for one scope row, e.g. `...scopes[1].leftBound`. */
  const getScopeRowViolations = (index: number, paramId: string, scopeIndex: number) => {
    const rowBase = `segments[${index}].params.${paramId}[${scopeIndex}]`;
    return violations.filter((v) => v.path === rowBase || v.path.startsWith(`${rowBase}.`));
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
                  const displayViolations = getUnmappedSegmentViolations(index);
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

                      {displayViolations.map((v, vi) => (
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
                        if (!isParamVisible(p, paramsMap)) return null;
                        const paramValue = paramsMap[p.id] ?? '';
                        const scopes = readIntervalScopes(paramsMap[p.id]);
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
                            ) : p.kind === 'ENUM' ? (
                              <select
                                id={`seg-${index}-param-${p.id}`}
                                className="text-input admin-field-control"
                                value={String(paramValue)}
                                disabled={disabled}
                                onChange={(e) => handleParamChange(index, p.id, e.target.value)}
                              >
                                <option value="">
                                  {t('admin.academic.video.scriptEditor.enumPlaceholder')}
                                </option>
                                {(p.choices ?? []).map((choice) => (
                                  <option key={choice} value={choice}>
                                    {choice}
                                  </option>
                                ))}
                              </select>
                            ) : p.kind === 'INTERVAL_SET' ? (
                              <div className="admin-stack-sm">
                                {getScopeArrayViolations(index, p.id).map((v, vi) => (
                                  <p key={vi} className="admin-field-error" role="alert">
                                    {v.code} ({v.path})
                                  </p>
                                ))}
                                {scopes.length === 0 ? (
                                  <p className="admin-muted">
                                    {t('admin.academic.video.scriptEditor.scopesEmpty')}
                                  </p>
                                ) : (
                                  <div className="admin-stack-sm">
                                    {scopes.map((scope, scopeIndex) => {
                                      const rowViolations = getScopeRowViolations(
                                        index,
                                        p.id,
                                        scopeIndex,
                                      );
                                      return (
                                        <div
                                          key={scopeIndex}
                                          className={`admin-scope-card admin-stack-sm ${
                                            rowViolations.length > 0 ? 'admin-card-invalid' : ''
                                          }`}
                                        >
                                          <div className="admin-row-between">
                                            <span className="yukcsca-tag admin-tag-compact">
                                              {t('admin.academic.video.scriptEditor.scopeNumber', {
                                                index: scopeIndex + 1,
                                              })}
                                            </span>
                                            <AdminRemoveButton
                                              label={t(
                                                'admin.academic.video.scriptEditor.removeScope',
                                                { index: scopeIndex + 1 },
                                              )}
                                              disabled={disabled}
                                              onClick={() =>
                                                handleRemoveScope(index, p.id, scopeIndex)
                                              }
                                            />
                                          </div>
                                          {rowViolations.map((v, vi) => (
                                            <p key={vi} className="admin-field-error" role="alert">
                                              {v.code} ({v.path})
                                            </p>
                                          ))}
                                          {renderScopeEnd(index, p.id, scopeIndex, scope, 'left')}
                                          {renderScopeEnd(index, p.id, scopeIndex, scope, 'right')}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="admin-row-between">
                                  <button
                                    type="button"
                                    className="btn-secondary admin-btn-compact"
                                    onClick={() => handleAddScope(index, p.id)}
                                    disabled={disabled || scopes.length >= MAX_INTERVAL_SCOPES}
                                  >
                                    <Plus size={16} />
                                    {t('admin.academic.video.scriptEditor.addScope')}
                                  </button>
                                  {scopes.length >= MAX_INTERVAL_SCOPES ? (
                                    <span className="admin-hint">
                                      {t('admin.academic.video.scriptEditor.scopesMaxHint', {
                                        max: MAX_INTERVAL_SCOPES,
                                      })}
                                    </span>
                                  ) : null}
                                </div>
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
