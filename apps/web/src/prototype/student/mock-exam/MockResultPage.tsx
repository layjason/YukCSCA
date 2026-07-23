import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { mockQuestions } from '@/prototype/student/fixtures';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function MockResultPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state, dispatch } = usePrototype();
  if (!state.mockSubmitted) {
    return <Navigate to="/app/mock-exams" replace />;
  }

  const answeredQuestions = mockQuestions.filter(
    (question) => state.mockAnswers[question.id] !== undefined,
  );
  const correctCount = mockQuestions.filter(
    (question) => state.mockAnswers[question.id] === question.correctIndex,
  ).length;
  const topicStrengths = answeredQuestions
    .filter((question) => state.mockAnswers[question.id] === question.correctIndex)
    .map((question) => question.topic);
  const topicWeaknesses = mockQuestions
    .filter((question) => state.mockAnswers[question.id] !== question.correctIndex)
    .map((question) => question.topic);
  const hasPriorityProposal = topicWeaknesses.length > 0;

  return (
    <div className="page-content">
      <h1>{t('mock.resultTitle')}</h1>

      <p className="preview-contextual">
        {t('mock.result.previewNote', { count: mockQuestions.length })}
      </p>

      <section className="result-section" aria-live="polite">
        <h2>{t('mock.result.score', { correct: correctCount, total: mockQuestions.length })}</h2>
      </section>

      <section className="result-section" aria-labelledby="strengths-heading">
        <h2 id="strengths-heading">{t('mock.result.strengths')}</h2>
        <ul role="list">
          {topicStrengths.map((topic) => (
            <li key={topic} className="result-item result-strength">
              <strong>{topic}</strong>
            </li>
          ))}
          {topicStrengths.length === 0 && <li>{t('mock.result.noStrengthEvidence')}</li>}
        </ul>
      </section>

      <section className="result-section" aria-labelledby="weaknesses-heading">
        <h2 id="weaknesses-heading">{t('mock.result.weaknesses')}</h2>
        <ul role="list">
          {topicWeaknesses.map((topic) => (
            <li key={topic} className="result-item result-gap">
              <strong>{topic}</strong>
            </li>
          ))}
          {topicWeaknesses.length === 0 && <li>{t('mock.result.noSampleGaps')}</li>}
        </ul>
      </section>

      <section className="result-section">
        <h2>{t('mock.result.timeObservation')}</h2>
        <p>{t('mock.result.timePreviewObservation')}</p>
      </section>

      <section className="result-section result-recommendation">
        <h2>{t('mock.result.remediation')}</h2>
        <p>
          {hasPriorityProposal
            ? t('mock.result.remediationRecommendation', { topic: topicWeaknesses[0] })
            : t('mock.result.continueRecommendation')}
        </p>
        {hasPriorityProposal && (
          <Link to="/app/practice/practice-factorisation-1" className="btn-secondary">
            {t('mock.result.openRemediation')}
          </Link>
        )}
      </section>

      {hasPriorityProposal && (
        <section className="result-section">
          <h2>{t('mock.result.priorityChange')}</h2>
          <p>{t('mock.result.priorityProposal')}</p>
          <ul>
            <li>{t('mock.result.priorityReason')}</li>
            <li>{t('mock.result.priorityImpact')}</li>
          </ul>
          {state.priorityChangeApproved ? (
            <p className="feedback-correct milestone-complete" role="status">
              {t('mock.result.priorityApproved')}
            </p>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch({ type: 'APPROVE_PRIORITY_CHANGE' })}
            >
              {t('mock.result.approvePriority')}
            </button>
          )}
        </section>
      )}

      <div className="result-actions">
        <Link to="/app/progress" className="btn-primary">
          {t('mock.result.viewProgress')}
        </Link>
        <Link to="/app/practice" className="btn-secondary">
          {t('mock.result.practiceMore')}
        </Link>
      </div>
    </div>
  );
}
