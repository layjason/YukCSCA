import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { diagnosticQuestions } from '@/prototype/student/fixtures';

export function DiagnosticPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(state.diagnosticAnswers);
  const [submitting, setSubmitting] = useState(false);

  const question = diagnosticQuestions[currentIndex];
  const totalQuestions = diagnosticQuestions.length;
  const isLast = currentIndex === totalQuestions - 1;
  const selectedAnswer = question ? answers[question.id] : undefined;

  function handleSelect(answerIndex: number): void {
    if (!question) return;
    const updated = { ...answers, [question.id]: answerIndex };
    setAnswers(updated);
    dispatch({
      type: 'SET_DIAGNOSTIC_ANSWER',
      questionId: question.id,
      answerIndex,
    });
  }

  function handleNext(): void {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrevious(): void {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleSubmit(): void {
    setSubmitting(true);
    setTimeout(() => {
      dispatch({ type: 'SUBMIT_DIAGNOSTIC' });
      navigate('/onboarding/student/diagnostic/result');
    }, 400);
  }

  if (!question) {
    return (
      <div className="page-content onboarding-page">
        <h1>{t('onboarding.diagnosticTitle')}</h1>
        <p>{t('onboarding.diagnosticEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="page-content onboarding-page">
      <h1>{t('onboarding.diagnosticTitle')}</h1>
      <p className="onboarding-description">{t('onboarding.diagnosticDescription')}</p>

      <div className="diagnostic-progress" aria-live="polite">
        {t('mock.session.question', { current: currentIndex + 1, total: totalQuestions })}
      </div>

      <fieldset className="diagnostic-question">
        <legend className="question-prompt">{question.prompt}</legend>
        {question.promptZh && (
          <p className="question-prompt-zh" lang="zh">
            {question.promptZh}
            {question.pinyin && <span className="pinyin"> ({question.pinyin})</span>}
          </p>
        )}
        <div className="answer-options" role="radiogroup">
          {question.options.map((option, i) => (
            <label key={i} className="answer-option">
              <input
                type="radio"
                name={`diagnostic-${question.id}`}
                value={i}
                checked={selectedAnswer === i}
                onChange={() => handleSelect(i)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="diagnostic-nav">
        {currentIndex > 0 && (
          <button type="button" className="btn-secondary" onClick={handlePrevious}>
            {t('mock.session.previous')}
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
          disabled={selectedAnswer === undefined || submitting}
        >
          {submitting
            ? t('practice.submitting')
            : isLast
              ? t('practice.submit')
              : t('mock.session.next')}
        </button>
      </div>
    </div>
  );
}
