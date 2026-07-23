import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function MistakesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = usePrototype();

  if (state.mistakes.length === 0) {
    return (
      <div className="page-content">
        <h1>{t('mistakes.title')}</h1>
        <p className="empty-state">{t('mistakes.noMistakes')}</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1>{t('mistakes.title')}</h1>
      <ul className="mistake-list" role="list">
        {state.mistakes.map((mistake) => (
          <li key={mistake.id} className="mistake-item">
            <Link to={`/app/practice/mistakes/${mistake.id}`}>
              <strong>{mistake.topic}</strong>
              <p className="task-meta">{mistake.questionPrompt}</p>
              <span className={`review-status status-${mistake.reviewStatus}`}>
                {t(`mistakes.${mistake.reviewStatus}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
