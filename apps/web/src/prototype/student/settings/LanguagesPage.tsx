import { useTranslation } from 'react-i18next';
import { usePrototype } from '@/prototype/student/prototypeContext';

export function LanguagesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { state } = usePrototype();

  return (
    <div className="page-content">
      <h1>{t('settings.languagesTitle')}</h1>

      <section className="settings-section" aria-labelledby="interface-lang-heading">
        <h2 id="interface-lang-heading">{t('settings.interfaceLanguage')}</h2>
        <select
          aria-labelledby="interface-lang-heading"
          value={i18n.resolvedLanguage ?? 'id'}
          onChange={(event) => void i18n.changeLanguage(event.target.value)}
        >
          <option value="id">{t('studentActivation.languages.id')}</option>
          <option value="en">{t('studentActivation.languages.en')}</option>
          <option value="zh-CN">{t('studentActivation.languages.zh-CN')}</option>
        </select>
        <p>{t('settings.languageNote')}</p>
      </section>

      <section className="settings-section" aria-labelledby="explanation-lang-heading">
        <h2 id="explanation-lang-heading">{t('settings.explanationLanguage')}</h2>
        <p className="task-meta">
          {t(`studentActivation.languages.${state.defaultExplanationLanguage}`)}
        </p>
        <p>{t('settings.explanationOwnership')}</p>
        <p>{t('settings.historyNote')}</p>
      </section>

      <section className="settings-section" aria-labelledby="exam-lang-heading">
        <h2 id="exam-lang-heading">{t('settings.examLanguage')}</h2>
        <p className="task-meta">{t('fixture.subjects.mathEnglishName')}: English</p>
        <p>{t('settings.examOwnership')}</p>
        <p className="exam-language-warning">{t('settings.examLanguageWarning')}</p>
      </section>

      <section className="settings-section" aria-labelledby="temp-lang-heading">
        <h2 id="temp-lang-heading">{t('settings.tempExplanation')}</h2>
        <p>{t('lesson.tempLanguageNote')}</p>
      </section>
    </div>
  );
}
