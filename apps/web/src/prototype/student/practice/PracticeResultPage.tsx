import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function PracticeResultPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const { state } = usePrototype();

  const session = state.practiceSessions.find((s) => s.id === sessionId);
  if (!session) {
    return (
      <div className="page-content">
        <h1>{t('practice.resultTitle')}</h1>
        <p>{t('practice.placeholder')}</p>
      </div>
    );
  }

  const firstQuestion = session.questions[0];
  if (!firstQuestion) {
    return (
      <div className="page-content">
        <h1>{t('practice.resultTitle')}</h1>
        <p>{t('practice.placeholder')}</p>
      </div>
    );
  }

  const results = session.questions.map((question) => ({
    question,
    answer: state.practiceAnswers[question.id],
    correct: state.practiceAnswers[question.id] === question.correctIndex,
  }));
  const correctCount = results.filter((result) => result.correct).length;
  const firstIncorrect = results.find((result) => !result.correct);
  const mistake = firstIncorrect
    ? state.mistakes.find((item) => item.id === `mistake-${firstIncorrect.question.id}`)
    : undefined;

  return (
    <div className="page-content">
      <h1>{t('practice.resultTitle')}</h1>

      <section className="result-section" aria-live="polite">
        <h2>
          {t('practice.resultSummary', {
            correct: correctCount,
            total: session.questions.length,
          })}
        </h2>
        {!firstIncorrect ? (
          <div className="feedback-card feedback-correct-card">
            <h2>{t('practice.correct')}</h2>
            <p>{firstQuestion.explanationCorrect}</p>
          </div>
        ) : (
          <div className="feedback-card feedback-incorrect-card">
            <h2>{t('practice.incorrect')}</h2>
            <p>{firstIncorrect.question.explanationIncorrect}</p>
            <div className="likely-cause">
              <strong>{t('practice.likelyCause')}:</strong>{' '}
              {t(`mistakes.causes.${firstIncorrect.question.likelyCause}`)}
            </div>
            <div className="suggested-review">
              <strong>{t('practice.suggestedReview')}:</strong> {t('mistakes.remediation')}
            </div>
          </div>
        )}
        <p className="mastery-caveat">{t('practice.evidenceCaveat')}</p>
      </section>

      {mistake && (
        <section className="result-section">
          <h2>{t('practice.viewMistake')}</h2>
          <Link to={`/app/practice/mistakes/${mistake.id}`} className="btn-secondary">
            {t('practice.viewMistake')}
          </Link>
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
