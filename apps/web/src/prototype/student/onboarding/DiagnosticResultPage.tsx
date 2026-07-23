import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { diagnosticQuestions, samplePlan } from '@/prototype/student/fixtures';
import type { DiagnosticResult, PlanState, TopicEvidence } from '@/prototype/student/types';

export function DiagnosticResultPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();
  const diagnosticResult = buildDiagnosticResult(state.diagnosticAnswers);

  function handleContinue(): void {
    dispatch({
      type: 'SET_PLAN',
      plan: buildPlan(
        diagnosticResult,
        state.goals?.examDate ?? samplePlan.examDate,
        state.goals?.weeklyHours ?? samplePlan.weeklyHours,
      ),
    });
    navigate('/onboarding/student/plan-review');
  }

  return (
    <div className="page-content onboarding-page">
      <h1>{t('onboarding.diagnosticResultTitle')}</h1>
      <p className="preview-contextual">{t('onboarding.diagnosticResult.previewNote')}</p>

      <section className="result-section" aria-labelledby="strengths-heading">
        <h2 id="strengths-heading">{t('onboarding.diagnosticResult.strengths')}</h2>
        <ul role="list">
          {diagnosticResult.strengths.map((item) => (
            <li key={item.topic} className="result-item result-strength">
              <strong>{item.topic}</strong>
              <p>{t(item.note)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="result-section" aria-labelledby="gaps-heading">
        <h2 id="gaps-heading">{t('onboarding.diagnosticResult.gaps')}</h2>
        <ul role="list">
          {diagnosticResult.gaps.map((item) => (
            <li key={item.topic} className="result-item result-gap">
              <strong>{item.topic}</strong>
              <p>{t(item.note)}</p>
            </li>
          ))}
        </ul>
      </section>

      {diagnosticResult.insufficientEvidence.length > 0 && (
        <section className="result-section" aria-labelledby="insufficient-heading">
          <h2 id="insufficient-heading">{t('onboarding.diagnosticResult.insufficientEvidence')}</h2>
          <p>{diagnosticResult.insufficientEvidence.join(', ')}</p>
        </section>
      )}

      {diagnosticResult.languageObservation && (
        <section className="result-section">
          <h2>{t('onboarding.diagnosticResult.languageObservation')}</h2>
          <p>{diagnosticResult.languageObservation}</p>
        </section>
      )}

      <section className="result-section result-recommendation">
        <h2>{t('onboarding.diagnosticResult.recommendation')}</h2>
        <p>{t(diagnosticResult.recommendation)}</p>
      </section>

      <button type="button" className="btn-primary" onClick={handleContinue}>
        {t('onboarding.diagnosticResult.continue')}
      </button>
    </div>
  );
}

function buildDiagnosticResult(answers: Record<string, number>): DiagnosticResult {
  const strengths: TopicEvidence[] = [];
  const gaps: TopicEvidence[] = [];

  diagnosticQuestions.forEach((question) => {
    const correct = answers[question.id] === question.correctIndex;
    (correct ? strengths : gaps).push({
      topic: question.topic,
      level: correct ? 'strong' : 'gap',
      note: correct
        ? 'onboarding.diagnosticResult.correctEvidence'
        : 'onboarding.diagnosticResult.incorrectEvidence',
    });
  });

  return {
    strengths,
    gaps,
    languageObservation: null,
    insufficientEvidence: ['Indices', 'Coordinate geometry', 'Trigonometry'],
    recommendation:
      gaps.length > 0
        ? 'onboarding.diagnosticResult.gapRecommendation'
        : 'onboarding.diagnosticResult.strengthRecommendation',
  };
}

function buildPlan(result: DiagnosticResult, examDate: string, weeklyHours: number): PlanState {
  const estimatedWeeklyNeed = 5;
  const feasibility =
    weeklyHours >= estimatedWeeklyNeed ? 'on-track' : weeklyHours >= 3 ? 'at-risk' : 'high-risk';

  return {
    ...samplePlan,
    examDate,
    weeklyHours,
    estimatedWeeklyNeed,
    feasibility,
    priorities: [
      ...result.gaps.map((item) => item.topic),
      ...result.strengths.map((item) => item.topic),
    ],
    riskExplanation:
      feasibility === 'on-track' ? null : 'onboarding.planReview.derivedRiskExplanation',
  };
}
