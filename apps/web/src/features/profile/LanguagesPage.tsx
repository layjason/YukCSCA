import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Toast, type ToastTone } from '@/shared/components/Toast';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  async function loadProfile(): Promise<void> {
    setLoading(true);
    setLoadError(null);
    try {
      const profile = await getMyStudentProfile();
      setDefaultExplanationLanguage(profile.defaultExplanationLanguage);
      setInitialLanguage(profile.defaultExplanationLanguage);
    } catch {
      setLoadError(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
    // Loading is intentionally tied to route entry; locale changes must not refetch profile state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExplanationLanguageChange(newLang: ExplanationLanguage): void {
    setDefaultExplanationLanguage(newLang);
    if (newLang !== initialLanguage) {
      setToast({
        message: `${t('profile.languageNote')} ${t('settings.historyNote')}`,
        tone: 'info',
      });
    }
  }

  async function handleSaveExplanationLanguage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setToast(null);
    setSaveError(null);

    if (defaultExplanationLanguage === initialLanguage) {
      setToast({ message: t('profile.noChanges'), tone: 'info' });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyStudentProfile({ defaultExplanationLanguage });
      setDefaultExplanationLanguage(updated.defaultExplanationLanguage);
      setInitialLanguage(updated.defaultExplanationLanguage);
      setToast({ message: t('settings.languageSaved'), tone: 'success' });
    } catch {
      setSaveError(t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          durationMs={2000}
          onDismiss={dismissToast}
        />
      ) : null}

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
        ) : loadError ? (
          <>
            <p className="error-message" role="alert">
              {loadError}
            </p>
            <button type="button" className="btn-secondary" onClick={() => void loadProfile()}>
              {t('profile.retry')}
            </button>
          </>
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

            {saveError ? (
              <p className="error-message" role="alert">
                {saveError}
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
        <p>{t('settings.examOwnership')}</p>
      </section>
    </div>
  );
}
