import { useTranslation } from 'react-i18next';
import { syllabusTopics } from '@/prototype/student/fixtures';

export function SyllabusPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="page-content">
      <h1>{t('syllabus.title')}</h1>
      <p className="preview-contextual">{t('syllabus.sourceNote')}</p>

      <section aria-labelledby="platform-heading">
        <h2 id="platform-heading">{t('syllabus.platformCoverage')}</h2>
        <table className="syllabus-table">
          <thead>
            <tr>
              <th scope="col">{t('learn.topics')}</th>
              <th scope="col">{t('syllabus.platformCoverage')}</th>
              <th scope="col">{t('syllabus.personalStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {syllabusTopics.map((topic) => (
              <tr key={topic.id}>
                <td>{t(topic.name)}</td>
                <td>
                  {t(
                    `syllabus.${topic.coverageStatus === 'covered' ? 'covered' : topic.coverageStatus === 'partially-covered' ? 'partiallyCovered' : topic.coverageStatus === 'planned' ? 'planned' : 'notCovered'}`,
                  )}
                </td>
                <td>
                  {t(
                    `syllabus.${topic.personalStatus === 'not-started' ? 'notStarted' : topic.personalStatus === 'in-progress' ? 'inProgress' : topic.personalStatus === 'review-needed' ? 'reviewNeeded' : topic.personalStatus === 'learned' ? 'learned' : 'mastered'}`,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
