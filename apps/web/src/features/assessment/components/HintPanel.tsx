import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import { isHintActionDisabled, nextHintTier, shouldConfirmBeforeHint } from '../assessmentPolicy';
import type { AssessmentSessionPurpose, SessionItemView } from '../types';
import { AssessmentBlocks } from './AssessmentBlocks';

interface HintPanelProps {
  item: SessionItemView;
  purpose: AssessmentSessionPurpose;
  busy: boolean;
  onDisclose: () => Promise<void>;
}

/**
 * Progressive math hints. STRONG uses soft stuck/reveal wording — never a bare "Strong" label.
 * REVALIDATION: hide STRONG entirely (do not show a disabled "cannot be shown" control).
 * Exhausted ladder: hide the action (no "No more hints" dead button).
 */
export function HintPanel({
  item,
  purpose,
  busy,
  onDisclose,
}: HintPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const gate = isHintActionDisabled(item, purpose);
  const needsConfirm = shouldConfirmBeforeHint(item);
  const next = nextHintTier(item);

  const hideAction =
    gate.reason === 'exhausted' ||
    gate.reason === 'revalidation_strong' ||
    gate.reason === 'locked' ||
    !next;

  const hasDisclosed = item.disclosedHints.length > 0;
  if (hideAction && !hasDisclosed && !confirmOpen) {
    return null;
  }

  async function handlePrimary(): Promise<void> {
    if (gate.disabled || busy || hideAction) return;
    if (needsConfirm && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    await onDisclose();
  }

  function hintButtonLabel(): string {
    if (needsConfirm) return t('assessment.hints.revealIfStuck');
    return t('assessment.hints.showNext');
  }

  /** Sequential Hint 1…N — STRONG is just the next rung, not a separate “Full solution” label. */
  function disclosedLabel(tierIndex: number): string {
    return t('assessment.hints.tier', { n: tierIndex + 1 });
  }

  return (
    <section className="assessment-hints" aria-label={t('assessment.hints.regionLabel')}>
      {hasDisclosed ? (
        <ul className="assessment-hint-list">
          {item.disclosedHints.map((hint) => (
            <li
              key={hint.tierIndex}
              className={`assessment-hint-card${hint.strength === 'STRONG' ? ' is-reveal' : ''}`}
            >
              <div className="assessment-hint-meta">
                <Lightbulb size={16} aria-hidden="true" />
                <span>{disclosedLabel(hint.tierIndex)}</span>
              </div>
              <AssessmentBlocks blocks={hint.blocks} />
            </li>
          ))}
        </ul>
      ) : null}

      {confirmOpen ? (
        <div className="assessment-hint-confirm" role="dialog" aria-labelledby="hint-confirm-title">
          <div className="assessment-hint-confirm-icon">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div>
            <p id="hint-confirm-title" className="assessment-hint-confirm-title">
              {t('assessment.hints.confirmTitle')}
            </p>
            <p className="assessment-hint-confirm-body">{t('assessment.hints.confirmBody')}</p>
            <div className="assessment-hint-confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
              >
                {t('assessment.hints.confirmCancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handlePrimary()}
                disabled={busy}
              >
                {t('assessment.hints.confirmReveal')}
              </button>
            </div>
          </div>
        </div>
      ) : !hideAction ? (
        <button
          type="button"
          className={`btn-secondary assessment-hint-btn${needsConfirm ? ' is-caution' : ''}`}
          onClick={() => void handlePrimary()}
          disabled={gate.disabled || busy}
          aria-disabled={gate.disabled || busy}
        >
          <Lightbulb size={18} aria-hidden="true" />
          {hintButtonLabel()}
        </button>
      ) : null}
    </section>
  );
}
