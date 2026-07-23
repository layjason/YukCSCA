import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePrototype } from '@/prototype/student/prototypeContext';
import { sampleRecommendations } from '@/prototype/student/fixtures';
import type { ExamLanguage, SubjectRecommendation } from '@/prototype/student/types';

export function SubjectsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = usePrototype();

  const [subjects, setSubjects] = useState<SubjectRecommendation[]>(
    state.subjects ??
      sampleRecommendations.map((subject) => ({
        ...subject,
        confirmed: subject.id === 'math-en',
      })),
  );
  const [showExamWarning, setShowExamWarning] = useState<string | null>(null);
  const [requiredRiskAcknowledged, setRequiredRiskAcknowledged] = useState(false);

  function handleExamLanguageChange(id: string, lang: ExamLanguage): void {
    setShowExamWarning(id);
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, examLanguage: lang } : s)));
  }

  function handleConfirm(): void {
    dispatch({ type: 'CONFIRM_SUBJECTS', subjects });
    navigate('/onboarding/student/diagnostic');
  }

  function handleToggleSubject(id: string): void {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id ? { ...subject, confirmed: !subject.confirmed } : subject,
      ),
    );
    const subject = subjects.find((item) => item.id === id);
    if (subject?.status === 'explicitly-required' && subject.confirmed) {
      setRequiredRiskAcknowledged(false);
    }
  }

  const hasSelectedSubject = subjects.some((subject) => subject.confirmed);
  const excludedRequiredSubject = subjects.some(
    (subject) => subject.status === 'explicitly-required' && !subject.confirmed,
  );

  return (
    <div className="page-content onboarding-page">
      <h1>{t('onboarding.subjectsTitle')}</h1>
      <p className="onboarding-description">{t('onboarding.subjectsDescription')}</p>

      <div className="language-separation-note" role="note">
        <p>{t('onboarding.subjects.languageSeparation')}</p>
      </div>

      <ul className="subject-list" role="list">
        {subjects.map((subject) => (
          <li key={subject.id} className="subject-card">
            <div className="subject-header">
              <h2 className="subject-name">{t(subject.name)}</h2>
              <span className={`subject-status status-${subject.status}`}>
                {t(`onboarding.subjects.status.${subject.status}`)}
              </span>
            </div>
            <p className="subject-reason">{t(subject.reason)}</p>
            <p className="subject-source">{t('onboarding.subjects.previewSource')}</p>

            <div className="subject-language-row">
              <label htmlFor={`exam-lang-${subject.id}`}>
                {t('onboarding.subjects.examLanguage')}
              </label>
              <select
                id={`exam-lang-${subject.id}`}
                value={subject.examLanguage}
                onChange={(e) =>
                  handleExamLanguageChange(subject.id, e.target.value as ExamLanguage)
                }
              >
                <option value="en">English</option>
                <option value="zh-CN">{t('studentActivation.languages.zh-CN')}</option>
              </select>
            </div>

            {showExamWarning === subject.id && (
              <p className="exam-language-warning" role="alert">
                {t('settings.examLanguageWarning')}
              </p>
            )}

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={subject.confirmed}
                onChange={() => handleToggleSubject(subject.id)}
              />
              {t('onboarding.subjects.confirmSubject')}
            </label>
            {subject.status === 'explicitly-required' && !subject.confirmed && (
              <p className="state-notice state-notice-warning" role="alert">
                {t('onboarding.subjects.requiredRisk')}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="explanation-language-display">
        <p>
          <strong>{t('settings.explanationLanguage')}:</strong>{' '}
          {t('studentActivation.languages.id')}
        </p>
        <p className="language-note">{t('settings.languageNote')}</p>
      </div>

      {excludedRequiredSubject && (
        <label className="checkbox-label subject-risk-confirmation">
          <input
            type="checkbox"
            checked={requiredRiskAcknowledged}
            onChange={(event) => setRequiredRiskAcknowledged(event.target.checked)}
          />
          {t('onboarding.subjects.acknowledgeRequiredRisk')}
        </label>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={handleConfirm}
        disabled={!hasSelectedSubject || (excludedRequiredSubject && !requiredRiskAcknowledged)}
      >
        {t('onboarding.subjectsConfirm')}
      </button>
    </div>
  );
}
