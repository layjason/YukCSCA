import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function PracticeSessionPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const session = state.practiceSessions.find((s) => s.id === sessionId);

  if (!session) {
    return (
      <div className="page-content">
        <h1>{t('practice.sessionTitle')}</h1>
        <p>{t('practice.placeholder')}</p>
      </div>
    );
  }

  const question = session.questions[currentIndex];

  if (!question) {
    return (
      <div className="page-content">
        <h1>{t('practice.sessionTitle')}</h1>
        <p>{t('practice.placeholder')}</p>
      </div>
    );
  }

  const activeSession = session;
  const activeQuestion = question;
  const selectedAnswer = state.practiceAnswers[activeQuestion.id];
  const isLast = currentIndex === activeSession.questions.length - 1;

  function handleSelect(answerIndex: number): void {
    setError(false);
    dispatch({
      type: 'SET_PRACTICE_ANSWER',
      questionId: activeQuestion.id,
      answerIndex,
    });
  }

  function handleShowHint(): void {
    if (hintsShown < activeQuestion.hints.length) {
      setHintsShown((h) => h + 1);
    }
  }

  function handleSubmit(): void {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (state.practiceSubmitFailuresRemaining > 0) {
        dispatch({ type: 'CONSUME_PRACTICE_FAILURE' });
        setError(true);
        return;
      }
      dispatch({ type: 'SUBMIT_PRACTICE', sessionId: activeSession.id });
      dispatch({ type: 'COMPLETE_TODAY_TASK', taskId: 'today-2' });

      activeSession.questions.forEach((practiceQuestion) => {
        const answer = state.practiceAnswers[practiceQuestion.id];
        if (answer === practiceQuestion.correctIndex) return;
        dispatch({
          type: 'ADD_MISTAKE',
          mistake: {
            id: `mistake-${practiceQuestion.id}`,
            topic: practiceQuestion.topic,
            questionPrompt: practiceQuestion.prompt,
            attemptedAnswer: practiceQuestion.options[answer ?? 0] ?? '',
            correctAnswer: practiceQuestion.options[practiceQuestion.correctIndex] ?? '',
            explanation: practiceQuestion.explanationIncorrect,
            likelyCause: practiceQuestion.likelyCause,
            remediationTitle: 'fixture.mistake.remediationTitle',
            remediationContent: 'fixture.mistake.remediationContent',
            reviewStatus: 'scheduled',
            createdAt: '2026-07-23',
          },
        });
      });
      navigate(`/app/practice/${activeSession.id}/result`);
    }, 500);
  }

  return (
    <div className="page-content">
      <h1>{t('practice.sessionTitle')}</h1>
      <p className="task-meta">
        {session.topic} · {t('practice.examLanguage')}:{' '}
        {session.examLanguage === 'en' ? 'English' : '中文'}
      </p>

      <div className="diagnostic-progress" aria-live="polite">
        {t('mock.session.question', {
          current: currentIndex + 1,
          total: session.questions.length,
        })}
      </div>

      <fieldset className="diagnostic-question">
        <legend className="question-prompt">{question.prompt}</legend>
        {question.promptZh && (
          <p className="question-prompt-zh" lang="zh">
            {question.promptZh}
          </p>
        )}
        <div className="answer-options" role="radiogroup">
          {question.options.map((option, i) => (
            <label key={i} className="answer-option">
              <input
                type="radio"
                name={`practice-${question.id}`}
                value={i}
                checked={selectedAnswer === i}
                onChange={() => handleSelect(i)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {hintsShown > 0 && (
        <div className="hints-area" aria-live="polite">
          {question.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="hint-item">
              <strong>{t('practice.hint', { number: i + 1 })}:</strong> {hint}
            </p>
          ))}
        </div>
      )}

      {hintsShown < question.hints.length && (
        <button type="button" className="btn-secondary" onClick={handleShowHint}>
          {t('practice.showHint')}
        </button>
      )}

      {error && (
        <div className="state-notice state-notice-danger" role="alert">
          <p>{t('practice.submitError')}</p>
          <p>{t('practice.retryNote')}</p>
          <button type="button" className="btn-secondary" onClick={handleSubmit}>
            {t('practice.retry')}
          </button>
        </div>
      )}

      <div className="diagnostic-nav">
        {currentIndex > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setCurrentIndex((i) => i - 1);
              setHintsShown(0);
            }}
          >
            {t('mock.session.previous')}
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setCurrentIndex((i) => i + 1);
              setHintsShown(0);
            }}
            disabled={selectedAnswer === undefined}
          >
            {t('mock.session.next')}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={selectedAnswer === undefined || submitting}
          >
            {submitting ? t('practice.submitting') : t('practice.submit')}
          </button>
        )}
      </div>
    </div>
  );
}
