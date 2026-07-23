import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function MockInstructionsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { examId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();
  const exam = state.mockExams.find((item) => item.id === examId);

  function handleStart(): void {
    if (examId) {
      dispatch({ type: 'START_MOCK', examId });
    }
    navigate(`/app/mock-exams/${examId}/session`);
  }

  return (
    <div className="page-content">
      <h1>{t('mock.instructionsTitle')}</h1>

      {exam && (
        <dl className="mock-instruction-meta">
          <div>
            <dt>{t('mock.examLanguage')}</dt>
            <dd>{exam.examLanguage === 'en' ? 'English' : '中文'}</dd>
          </div>
          <div>
            <dt>{t('mock.durationLabel')}</dt>
            <dd>{t('mock.duration', { minutes: exam.estimatedMinutes })}</dd>
          </div>
          <div>
            <dt>{t('mock.syllabusScope')}</dt>
            <dd>{t(exam.syllabusScope)}</dd>
          </div>
        </dl>
      )}

      <section className="instructions-list" aria-labelledby="instructions-heading">
        <h2 id="instructions-heading" className="sr-only">
          {t('mock.instructionsTitle')}
        </h2>
        <ul role="list">
          <li>{t('mock.instructions.timing')}</li>
          <li>{t('mock.instructions.navigation')}</li>
          <li>{t('mock.instructions.markReview')}</li>
          <li>{t('mock.instructions.submission')}</li>
          <li>{t('mock.instructions.noAi')}</li>
          <li>{t('mock.instructions.afterSubmit')}</li>
          <li>{t('mock.instructions.duplicateProtection')}</li>
        </ul>
        <p className="preview-contextual">{t('mock.instructions.previewNote')}</p>
      </section>

      <button type="button" className="btn-primary" onClick={handleStart}>
        {t('mock.instructions.accept')}
      </button>
    </div>
  );
}
