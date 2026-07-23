import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { PrototypeStatusBoundary } from '@/prototype/student/components/PrototypeStatusBoundary';

export function PracticePage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = usePrototype();

  const sessions = state.practiceSessions;

  return (
    <PrototypeStatusBoundary>
      <div className="page-content">
        <h1>{t('practice.title')}</h1>

        {sessions.length > 0 ? (
          <section aria-labelledby="assigned-heading">
            <h2 id="assigned-heading">{t('practice.assigned')}</h2>
            <ul className="practice-list" role="list">
              {sessions.map((session) => (
                <li key={session.id} className="practice-item">
                  <h3>{session.topic}</h3>
                  <p className="task-meta">
                    {t('practice.questions', { count: session.questions.length })} ·{' '}
                    {t('practice.estimatedMinutes', { minutes: session.estimatedMinutes })}
                  </p>
                  <Link to={`/app/practice/${session.id}`} className="btn-primary">
                    {state.practiceSubmitted[session.id]
                      ? t('practice.resume')
                      : t('practice.start')}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="empty-state">{t('practice.placeholder')}</p>
        )}

        <section aria-labelledby="mistakes-heading">
          <h2 id="mistakes-heading">{t('nav.mistakes')}</h2>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            {t('nav.mistakes')}
            {state.mistakes.length > 0 && ` (${state.mistakes.length})`}
          </Link>
        </section>
      </div>
    </PrototypeStatusBoundary>
  );
}
