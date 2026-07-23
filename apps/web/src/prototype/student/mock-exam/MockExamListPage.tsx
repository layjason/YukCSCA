import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { PrototypeStatusBoundary } from '@/prototype/student/components/PrototypeStatusBoundary';

export function MockExamListPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = usePrototype();

  const exam = state.mockExams[0];
  const destination =
    exam?.status === 'completed'
      ? `/app/mock-exams/${exam.id}/result`
      : state.mockInterrupted || exam?.status === 'in-progress'
        ? `/app/mock-exams/${exam?.id}/session`
        : `/app/mock-exams/${exam?.id}/instructions`;
  const actionLabel =
    exam?.status === 'completed'
      ? t('mock.viewResult')
      : state.mockInterrupted || exam?.status === 'in-progress'
        ? t('mock.resumeExam')
        : t('mock.startExam');

  return (
    <PrototypeStatusBoundary>
      <div className="page-content">
        <h1>{t('mock.title')}</h1>

        {exam ? (
          <section className="mock-exam-card" aria-labelledby="exam-title">
            <h2 id="exam-title">{t(exam.title)}</h2>
            <dl className="mock-exam-meta">
              <div>
                <dt>{t('mock.examLanguage')}</dt>
                <dd>{exam.examLanguage === 'en' ? 'English' : '中文'}</dd>
              </div>
              <div>
                <dt>{t('mock.durationLabel')}</dt>
                <dd>{t('mock.duration', { minutes: exam.estimatedMinutes })}</dd>
              </div>
              <div>
                <dt>{t('mock.questionCountLabel')}</dt>
                <dd>{t('mock.questionCount', { count: exam.questionCount })}</dd>
              </div>
              <div>
                <dt>{t('mock.syllabusScope')}</dt>
                <dd>{t(exam.syllabusScope)}</dd>
              </div>
            </dl>
            <p className="task-meta">{t(`mock.status.${exam.status}`)}</p>
            {exam.status === 'not-started' && (
              <p className="preview-contextual">{t('mock.noHistory')}</p>
            )}
            <Link to={destination} className="btn-primary">
              {actionLabel}
            </Link>
          </section>
        ) : (
          <section className="empty-state state-notice state-notice-info">
            <h2>{t('mock.emptyTitle')}</h2>
            <p>{t('mock.noAvailableExam')}</p>
          </section>
        )}
      </div>
    </PrototypeStatusBoundary>
  );
}
