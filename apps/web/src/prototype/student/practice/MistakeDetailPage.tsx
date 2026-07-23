import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function MistakeDetailPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { mistakeId } = useParams();
  const { state, dispatch } = usePrototype();

  const mistake = state.mistakes.find((m) => m.id === mistakeId);

  if (!mistake) {
    return (
      <div className="page-content">
        <h1>{t('mistakes.detailTitle')}</h1>
        <div className="state-notice state-notice-info">
          <p>{t('mistakes.notFound')}</p>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            {t('mistakes.title')}
          </Link>
        </div>
      </div>
    );
  }
  const activeMistake = mistake;
  const isRemediationComplete = state.remediationCompleted.includes(mistake.id);

  function handleCompleteRemediation(): void {
    dispatch({ type: 'COMPLETE_REMEDIATION', mistakeId: activeMistake.id });
    dispatch({ type: 'COMPLETE_TODAY_TASK', taskId: 'today-3' });
  }

  return (
    <div className="page-content">
      <h1>{t('mistakes.detailTitle')}</h1>

      <section className="mistake-detail" aria-labelledby="mistake-topic">
        <dl>
          <div>
            <dt>{t('mistakes.topic')}</dt>
            <dd id="mistake-topic">{mistake.topic}</dd>
          </div>
          <div>
            <dt>{t('mistakes.attemptedAnswer')}</dt>
            <dd>{mistake.attemptedAnswer}</dd>
          </div>
          <div>
            <dt>{t('mistakes.correctAnswer')}</dt>
            <dd>{mistake.correctAnswer}</dd>
          </div>
        </dl>
      </section>

      <section className="result-section">
        <h2>{t('mistakes.explanation')}</h2>
        <p>{mistake.explanation}</p>
      </section>

      <section className="result-section">
        <h2>{t('mistakes.likelyCause')}</h2>
        <p>{t(`mistakes.causes.${mistake.likelyCause}`)}</p>
      </section>

      <section className="result-section remediation-section">
        <h2>{t('mistakes.remediation')}</h2>
        <h3>{t(mistake.remediationTitle)}</h3>
        <p>{t(mistake.remediationContent)}</p>
      </section>

      <section className="result-section">
        <h2>{t('mistakes.reviewStatus')}</h2>
        <p className={isRemediationComplete ? 'milestone-complete' : undefined}>
          {isRemediationComplete
            ? t('mistakes.completed')
            : mistake.reviewStatus === 'scheduled'
              ? t('mistakes.scheduled')
              : t('mistakes.pending')}
        </p>
      </section>

      {!isRemediationComplete && (
        <button type="button" className="btn-primary" onClick={handleCompleteRemediation}>
          {t('mistakes.completeRemediation')}
        </button>
      )}

      <div className="result-actions">
        <Link to="/app/progress" className="btn-secondary">
          {t('mock.result.viewProgress')}
        </Link>
      </div>
    </div>
  );
}
