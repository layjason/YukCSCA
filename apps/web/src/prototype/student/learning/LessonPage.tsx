import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { sampleLesson } from '@/prototype/student/fixtures';

export function LessonPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { lessonId } = useParams();
  const { state, dispatch } = usePrototype();
  const [checkpointAnswer, setCheckpointAnswer] = useState<number | null>(null);
  const [checkpointSubmitted, setCheckpointSubmitted] = useState(false);

  const lesson = sampleLesson;
  const explanationLanguage =
    state.temporaryExplanationLanguage ?? state.defaultExplanationLanguage;
  const explanationT = i18n.getFixedT(explanationLanguage);
  const checkpointCorrect = checkpointAnswer === lesson.checkpointCorrectIndex;

  useEffect(
    () => () => {
      dispatch({ type: 'SET_TEMP_EXPLANATION_LANGUAGE', language: null });
    },
    [dispatch],
  );

  function handleCheckpointSubmit(): void {
    setCheckpointSubmitted(true);
    if (checkpointCorrect) {
      dispatch({ type: 'COMPLETE_TODAY_TASK', taskId: 'today-1' });
    }
  }

  function handleCheckpointRetry(): void {
    setCheckpointAnswer(null);
    setCheckpointSubmitted(false);
  }

  if (lessonId !== lesson.id) {
    return (
      <div className="page-content">
        <h1>{t('lesson.title')}</h1>
        <p>{t('lesson.placeholder')}</p>
      </div>
    );
  }

  return (
    <div className="page-content lesson-page">
      <h1>{explanationT(lesson.title)}</h1>

      <section className="lesson-language-control" aria-labelledby="lesson-language-heading">
        <h2 id="lesson-language-heading">{t('lesson.explanationLanguage')}</h2>
        <select
          value={explanationLanguage}
          onChange={(event) =>
            dispatch({
              type: 'SET_TEMP_EXPLANATION_LANGUAGE',
              language: event.target.value as 'id' | 'en' | 'zh-CN',
            })
          }
        >
          <option value="id">{t('studentActivation.languages.id')}</option>
          <option value="en">{t('studentActivation.languages.en')}</option>
          <option value="zh-CN">{t('studentActivation.languages.zh-CN')}</option>
        </select>
        <p>{t('lesson.languageDimensions')}</p>
        <p className="task-meta">{t('lesson.tempLanguageNote')}</p>
      </section>

      <section className="lesson-section" aria-labelledby="objective-heading">
        <h2 id="objective-heading">{t('lesson.objective')}</h2>
        <p>{explanationT(lesson.objective)}</p>
      </section>

      <section className="lesson-section" aria-labelledby="explanation-heading">
        <h2 id="explanation-heading">{t('lesson.explanation')}</h2>
        <p>{explanationT(lesson.explanation)}</p>
      </section>

      <section className="lesson-section lesson-example" aria-labelledby="example-heading">
        <h2 id="example-heading">{t('lesson.workedExample')}</h2>
        <pre className="worked-example">{explanationT(lesson.workedExample)}</pre>
      </section>

      {lesson.terminology.length > 0 && (
        <section className="lesson-section" aria-labelledby="terminology-heading">
          <h2 id="terminology-heading">{t('lesson.terminology')}</h2>
          <p className="language-help-note">{t('lesson.languageHelp')}</p>
          <ul className="terminology-list" role="list">
            {lesson.terminology.map((entry) => (
              <li key={entry.term} className="terminology-item">
                <span className="term-zh" lang="zh">
                  {entry.term}
                </span>
                <span className="term-pinyin">{entry.pinyin}</span>
                <span className="term-definition">{explanationT(entry.definition)}</span>
                <code className="term-expression">{entry.expression}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lesson-section lesson-checkpoint" aria-labelledby="checkpoint-heading">
        <h2 id="checkpoint-heading">{t('lesson.checkpoint')}</h2>
        <fieldset className="diagnostic-question">
          <legend className="question-prompt">{lesson.checkpointQuestion}</legend>
          <div className="answer-options" role="radiogroup">
            {lesson.checkpointOptions.map((option, i) => (
              <label key={i} className="answer-option">
                <input
                  type="radio"
                  name="checkpoint"
                  value={i}
                  checked={checkpointAnswer === i}
                  onChange={() => setCheckpointAnswer(i)}
                  disabled={checkpointSubmitted}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {!checkpointSubmitted ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleCheckpointSubmit}
            disabled={checkpointAnswer === null}
          >
            {t('practice.submit')}
          </button>
        ) : (
          <div className="checkpoint-result" role="status" aria-live="polite">
            <p
              className={
                checkpointCorrect ? 'feedback-correct milestone-complete' : 'feedback-incorrect'
              }
            >
              {checkpointCorrect ? t('practice.correct') : t('practice.incorrect')}
            </p>
            {!checkpointCorrect && (
              <>
                <p>{t('lesson.checkpointRecovery')}</p>
                <button type="button" className="btn-secondary" onClick={handleCheckpointRetry}>
                  {t('lesson.retryCheckpoint')}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="lesson-section" aria-labelledby="summary-heading">
        <h2 id="summary-heading">{t('lesson.summary')}</h2>
        <p>{explanationT(lesson.summary)}</p>
        <p className="mastery-caveat">{t('lesson.masteryCaveat')}</p>
      </section>

      {checkpointSubmitted && checkpointCorrect && (
        <section className="lesson-practice-handoff">
          <h2>{t('lesson.assignedPractice')}</h2>
          <Link to={`/app/practice/${lesson.assignedPracticeId}`} className="btn-primary">
            {t('lesson.startPractice')}
          </Link>
        </section>
      )}
    </div>
  );
}
