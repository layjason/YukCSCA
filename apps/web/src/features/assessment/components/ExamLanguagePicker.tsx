import { useTranslation } from 'react-i18next';
import type { ExamLanguage } from '../types';

interface ExamLanguagePickerProps {
  value: ExamLanguage | null;
  available: readonly ExamLanguage[];
  onChange: (lang: ExamLanguage) => void;
  disabled?: boolean;
  id?: string;
}

/** Explicit exam-language chooser — never inferred from interface/explanation language. */
export function ExamLanguagePicker({
  value,
  available,
  onChange,
  disabled = false,
  id = 'exam-language',
}: ExamLanguagePickerProps): React.JSX.Element {
  const { t } = useTranslation();
  // Dedupe while preserving first-seen order (legacy packages may list one set per question).
  const unique = [...new Set(available)];

  return (
    <div className="assessment-exam-lang" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="assessment-field-label">
        {t('assessment.examLanguage')}
      </span>
      <div className="assessment-chip-row">
        {unique.map((lang) => {
          const selected = value === lang;
          return (
            <button
              key={lang}
              type="button"
              className={`assessment-chip${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(lang)}
            >
              {t(`assessment.examLanguages.${lang === 'zh-CN' ? 'zhCN' : lang}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
