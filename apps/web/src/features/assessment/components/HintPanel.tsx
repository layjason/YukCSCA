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
 * REVALIDATION pre-disables STRONG without probing the API.
 */
export function HintPanel({ item, purpose, busy, onDisclose }: HintPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const gate = isHintActionDisabled(item, purpose);
  const needsConfirm = shouldConfirmBeforeHint(item);
  const next = nextHintTier(item);

  async function handlePrimary(): Promise<void> {
    if (gate.disabled || busy) return;
    if (needsConfirm && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    await onDisclose();
  }

  function hintButtonLabel(): string {
    if (gate.reason === 'exhausted') return t('assessment.hints.exhausted');
    if (gate.reason === 'revalidation_strong') return t('assessment.hints.revalidationBlocked');
    if (needsConfirm) return t('assessment.hints.revealIfStuck');
    return t('assessment.hints.showNext');
  }

  return (
    <section className="assessment-hints" aria-label={t('assessment.hints.regionLabel')}>
      {item.disclosedHints.length > 0 ? (
        <ul className="assessment-hint-list">
          {item.disclosedHints.map((hint) => (
            <li
              key={hint.tierIndex}
              className={`assessment-hint-card${hint.strength === 'STRONG' ? ' is-reveal' : ''}`}
            >
              <div className="assessment-hint-meta">
                <Lightbulb size={16} aria-hidden="true" />
                <span>
                  {hint.strength === 'STRONG'
                    ? t('assessment.hints.revealTier', { n: hint.tierIndex + 1 })
                    : t('assessment.hints.tier', { n: hint.tierIndex + 1 })}
                </span>
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
      ) : (
        <button
          type="button"
          className={`btn-secondary assessment-hint-btn${needsConfirm ? ' is-caution' : ''}`}
          onClick={() => void handlePrimary()}
          disabled={gate.disabled || busy || !next}
          aria-disabled={gate.disabled || busy || !next}
        >
          <Lightbulb size={18} aria-hidden="true" />
          {hintButtonLabel()}
        </button>
      )}
    </section>
  );
}
