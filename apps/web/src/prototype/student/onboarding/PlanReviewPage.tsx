import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { samplePlan, todayTasks } from '@/prototype/student/fixtures';
import type { PlanAdjustment } from '@/prototype/student/types';

export function PlanReviewPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();

  const plan = state.plan ?? samplePlan;
  const [selectedAdjustment, setSelectedAdjustment] = useState<PlanAdjustment | null>(null);
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);

  const isAtRisk = plan.feasibility !== 'on-track';

  function handleConfirm(): void {
    dispatch({ type: 'CONFIRM_PLAN' });
    dispatch({ type: 'SET_LOADING', loading: false });
    navigate('/app/today');
  }

  return (
    <div className="page-content onboarding-page">
      <h1>{t('onboarding.planReviewTitle')}</h1>
      <p className="onboarding-description">{t('onboarding.planReviewDescription')}</p>

      <section className="plan-overview" aria-labelledby="plan-overview-heading">
        <h2 id="plan-overview-heading">{t('onboarding.planReview.overview')}</h2>
        <dl className="plan-details">
          <div>
            <dt>{t('onboarding.planReview.examDate')}</dt>
            <dd>{plan.examDate}</dd>
          </div>
          <div>
            <dt>{t('onboarding.planReview.weeksRemaining')}</dt>
            <dd>{plan.weeksRemaining}</dd>
          </div>
          <div>
            <dt>{t('onboarding.planReview.weeklyHours')}</dt>
            <dd>{plan.weeklyHours}h</dd>
          </div>
          <div>
            <dt>{t('onboarding.planReview.estimatedNeed')}</dt>
            <dd>{plan.estimatedWeeklyNeed}h</dd>
          </div>
        </dl>
      </section>

      <section className="plan-feasibility" aria-labelledby="feasibility-heading">
        <h2 id="feasibility-heading">{t('onboarding.planReview.feasibility')}</h2>
        <p
          className={`feasibility-badge feasibility-${plan.feasibility}${
            plan.feasibility === 'on-track' ? ' milestone-complete' : ''
          }`}
        >
          {t(
            `feasibility.${plan.feasibility === 'on-track' ? 'onTrack' : plan.feasibility === 'at-risk' ? 'atRisk' : 'highRisk'}`,
          )}
        </p>
        {plan.riskExplanation && (
          <p className="risk-explanation" role="alert">
            {t(plan.riskExplanation)}
          </p>
        )}
      </section>

      <section className="plan-priorities" aria-labelledby="priorities-heading">
        <h2 id="priorities-heading">{t('onboarding.planReview.priorities')}</h2>
        <ol>
          {plan.priorities.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>

      <section className="plan-tasks" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">{t('onboarding.planReview.firstWeek')}</h2>
        <ul role="list">
          {(plan.firstWeekTasks.length > 0 ? plan.firstWeekTasks : todayTasks).map((task) => (
            <li key={task.id} className="plan-task-item">
              <strong>{t(task.title)}</strong>
              <span className="task-meta">
                {t('today.estimatedTime', { minutes: task.estimatedMinutes })}
              </span>
              <p className="task-reason">{t(task.reason)}</p>
              <p className="task-completion">
                <strong>{t('today.completion')}:</strong> {t(task.completionRule)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {isAtRisk && plan.adjustments.length > 0 && (
        <section className="plan-adjustments" aria-labelledby="adjustments-heading">
          <h2 id="adjustments-heading">{t('onboarding.planReview.adjustments')}</h2>
          <div role="radiogroup" aria-labelledby="adjustments-heading">
            {plan.adjustments.map((adj) => (
              <label key={adj.id} className="adjustment-option">
                <input
                  type="radio"
                  name="adjustment"
                  checked={selectedAdjustment?.id === adj.id}
                  onChange={() => setSelectedAdjustment(adj)}
                />
                <span>
                  <strong>{t(adj.label)}</strong>
                  <em>{t(adj.consequence)}</em>
                </span>
              </label>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={acknowledgedRisk}
              onChange={(e) => setAcknowledgedRisk(e.target.checked)}
            />
            {t('onboarding.planReview.acknowledgeRisk')}
          </label>
        </section>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={handleConfirm}
        disabled={isAtRisk && !acknowledgedRisk}
      >
        {t('onboarding.planReviewConfirm')}
      </button>
    </div>
  );
}
