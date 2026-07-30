import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getMyStudentProfile, updateMyStudentProfile } from './studentProfileApi';
import type { ExplanationLanguage } from './studentProfile.types';

const languages: ExplanationLanguage[] = ['id', 'en', 'zh-CN'];

export function LanguagesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const [defaultExplanationLanguage, setDefaultExplanationLanguage] =
    useState<ExplanationLanguage>('id');
  const [initialLanguage, setInitialLanguage] = useState<ExplanationLanguage>('id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const profile = await getMyStudentProfile();
        setDefaultExplanationLanguage(profile.defaultExplanationLanguage);
        setInitialLanguage(profile.defaultExplanationLanguage);
      } catch {
        // Safe fallback if offline or in preview context
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function handleExplanationLanguageChange(newLang: ExplanationLanguage): void {
    setDefaultExplanationLanguage(newLang);
    if (newLang !== initialLanguage) {
      setToast({
        message: `${t('profile.languageNote')} ${t('settings.historyNote')}`,
        type: 'info',
      });
    }
  }

  async function handleSaveExplanationLanguage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setToast(null);
    setError(null);

    if (defaultExplanationLanguage === initialLanguage) {
      setToast({ message: t('profile.noChanges'), type: 'info' });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyStudentProfile({ defaultExplanationLanguage });
      setDefaultExplanationLanguage(updated.defaultExplanationLanguage);
      setInitialLanguage(updated.defaultExplanationLanguage);
      setToast({ message: t('settings.languageSaved'), type: 'success' });
    } catch {
      setError(t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      {toast
        ? createPortal(
            <div className="toast-container" aria-live="polite">
              <div className={`toast toast-${toast.type}`} role="status">
                <div className="toast-icon-wrapper" aria-hidden="true">
                  {toast.type === 'success' ? (
                    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="toast-body">
                  <span className="toast-message">{toast.message}</span>
                </div>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => setToast(null)}
                  aria-label="Dismiss notification"
                >
                  <svg className="toast-close-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <Link to="/app/profile" className="back-btn">
        <span className="back-arrow" aria-hidden="true">
          ←
        </span>
        {t('nav.backToProfile')}
      </Link>

      <h1>{t('settings.languagesTitle')}</h1>

      <section className="settings-section" aria-labelledby="interface-lang-heading">
        <h2 id="interface-lang-heading">{t('settings.interfaceLanguage')}</h2>
        <div className="form-group">
          <select
            aria-labelledby="interface-lang-heading"
            value={i18n.resolvedLanguage ?? 'id'}
            onChange={(event) => void i18n.changeLanguage(event.target.value)}
          >
            <option value="id">{t('studentActivation.languages.id')}</option>
            <option value="en">{t('studentActivation.languages.en')}</option>
            <option value="zh-CN">{t('studentActivation.languages.zh-CN')}</option>
          </select>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="explanation-lang-heading">
        <h2 id="explanation-lang-heading">{t('settings.explanationLanguage')}</h2>
        <p>{t('settings.explanationOwnership')}</p>

        {loading ? (
          <p className="task-meta">{t('shell.loading')}</p>
        ) : (
          <form onSubmit={(event) => void handleSaveExplanationLanguage(event)} noValidate>
            <div className="form-group">
              <label htmlFor="defaultExplanationLanguageSelect">
                {t('profile.defaultExplanationLanguage')}
              </label>
              <select
                id="defaultExplanationLanguageSelect"
                value={defaultExplanationLanguage}
                onChange={(event) =>
                  handleExplanationLanguageChange(event.target.value as ExplanationLanguage)
                }
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {t(`studentActivation.languages.${lang}`)}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <p className="error-message" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('settings.savingLanguage') : t('settings.saveLanguage')}
            </button>
          </form>
        )}
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
