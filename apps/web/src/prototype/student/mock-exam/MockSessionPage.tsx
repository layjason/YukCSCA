import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { mockQuestions } from '@/prototype/student/fixtures';

export function MockSessionPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { examId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [showSaved, setShowSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback((): void => {
    if (state.mockSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    dispatch({ type: 'SUBMIT_MOCK' });
    navigate(`/app/mock-exams/${examId}/result`);
  }, [dispatch, navigate, examId, isSubmitting, state.mockSubmitted]);

  useEffect(() => {
    if (state.mockInterrupted || state.mockSubmitted) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmit, state.mockInterrupted, state.mockSubmitted]);

  useEffect(() => {
    if (state.mockSubmitted) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [state.mockSubmitted]);

  const question = mockQuestions[currentIndex];
  const totalQuestions = mockQuestions.length;
  const selectedAnswer = question ? state.mockAnswers[question.id] : undefined;
  const isMarked = question ? state.mockMarkedForReview[question.id] : false;
  const answeredCount = mockQuestions.filter((q) => state.mockAnswers[q.id] !== undefined).length;

  if (state.mockInterrupted) {
    return (
      <div className="page-content mock-recovery">
        <h1>{t('mock.recovery.title')}</h1>
        <p>{t('mock.recovery.description', { answered: answeredCount, total: totalQuestions })}</p>
        <p className="preview-contextual">{t('mock.recovery.boundary')}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => dispatch({ type: 'RESUME_MOCK' })}
        >
          {t('mock.recovery.resume')}
        </button>
      </div>
    );
  }

  function handleSelect(answerIndex: number): void {
    if (!question) return;
    dispatch({
      type: 'SET_MOCK_ANSWER',
      questionId: question.id,
      answerIndex,
    });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }

  function handleToggleReview(): void {
    if (!question) return;
    dispatch({ type: 'TOGGLE_MOCK_REVIEW', questionId: question.id });
  }

  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (!question) {
    return (
      <div className="page-content">
        <h1>{t('mock.sessionTitle')}</h1>
        <p>{t('mock.placeholder')}</p>
      </div>
    );
  }

  return (
    <div className="page-content mock-session">
      <div className="mock-session-header">
        <h1 className="sr-only">{t('mock.sessionTitle')}</h1>
        <span
          className={`mock-timer${secondsLeft <= 120 ? ' mock-timer-low' : ''}`}
          role="timer"
          aria-live="off"
          aria-label={`${t('mock.session.timeRemaining')}: ${formatTime(secondsLeft)}`}
        >
          {formatTime(secondsLeft)}
        </span>
        <span className="mock-question-count">
          {t('mock.session.question', { current: currentIndex + 1, total: totalQuestions })}
        </span>
      </div>

      <fieldset className="diagnostic-question">
        <legend className="question-prompt">{question.prompt}</legend>
        <div className="answer-options" role="radiogroup">
          {question.options.map((option, i) => (
            <label key={i} className="answer-option">
              <input
                type="radio"
                name={`mock-${question.id}`}
                value={i}
                checked={selectedAnswer === i}
                onChange={() => handleSelect(i)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {showSaved && (
        <p className="save-acknowledgement" role="status" aria-live="polite">
          {t('mock.session.saved')}
        </p>
      )}

      <div className="mock-session-actions">
        <button
          type="button"
          className={`btn-secondary ${isMarked ? 'marked' : ''}`}
          onClick={handleToggleReview}
          aria-pressed={isMarked}
        >
          {isMarked ? t('mock.session.markedForReview') : t('mock.session.markForReview')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch({ type: 'INTERRUPT_MOCK' })}
        >
          {t('mock.session.simulateInterruption')}
        </button>
      </div>

      <nav className="mock-question-navigation" aria-label={t('mock.session.questionNavigation')}>
        {mockQuestions.map((item, index) => {
          const isAnswered = state.mockAnswers[item.id] !== undefined;
          const isReview = state.mockMarkedForReview[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={index === currentIndex ? 'question-nav-current' : ''}
              aria-current={index === currentIndex ? 'step' : undefined}
              onClick={() => setCurrentIndex(index)}
            >
              {index + 1}
              <span className="sr-only">
                {' '}
                {isAnswered ? t('mock.session.answered') : t('mock.session.unanswered')}
                {isReview ? `, ${t('mock.session.markedForReview')}` : ''}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="diagnostic-nav">
        {currentIndex > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            {t('mock.session.previous')}
          </button>
        )}
        {currentIndex < totalQuestions - 1 ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            {t('mock.session.next')}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => dialogRef.current?.showModal()}
          >
            {t('mock.session.submit')}
          </button>
        )}
      </div>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{t('mock.session.confirmTitle')}</h2>
        <p>
          {t('mock.session.confirmMessage', {
            answered: answeredCount,
            total: totalQuestions,
          })}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dialogRef.current?.close()}
          >
            {t('mock.session.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {t('mock.session.confirmSubmit')}
          </button>
        </div>
      </dialog>
    </div>
  );
}
