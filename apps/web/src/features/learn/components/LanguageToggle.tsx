import { useTranslation } from 'react-i18next';
import { EXPLANATION_LANGUAGES, type ExplanationLanguage } from '../types';

interface LanguageToggleProps {
  value: ExplanationLanguage;
  available: readonly ExplanationLanguage[];
  onChange: (language: ExplanationLanguage) => void;
  disabled?: boolean;
}

const SHORT_LABEL: Record<ExplanationLanguage, string> = {
  id: 'ID',
  en: 'EN',
  'zh-CN': '中文',
};

export function LanguageToggle({
  value,
  available,
  onChange,
  disabled = false,
}: LanguageToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  const availableSet = new Set(available);

  return (
    <div
      className="learn-language-toggle"
      role="group"
      aria-label={t('learn.lesson.explanationLanguage')}
    >
      {EXPLANATION_LANGUAGES.map((lang) => {
        const isAvailable = availableSet.has(lang);
        const isActive = value === lang;
        return (
          <button
            key={lang}
            type="button"
            className={`learn-language-chip${isActive ? ' is-active' : ''}${
              !isAvailable ? ' is-unavailable' : ''
            }`}
            aria-pressed={isActive}
            disabled={disabled || !isAvailable}
            title={
              isAvailable
                ? t(`studentActivation.languages.${lang}`)
                : t('learn.lesson.languageUnavailableOption')
            }
            onClick={() => onChange(lang)}
          >
            <span aria-hidden="true">{SHORT_LABEL[lang]}</span>
            <span className="sr-only">
              {t(`studentActivation.languages.${lang}`)}
              {!isAvailable ? ` — ${t('learn.lesson.languageUnavailableOption')}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
