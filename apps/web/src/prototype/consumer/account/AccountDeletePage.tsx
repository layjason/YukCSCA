import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export function AccountDeletePage(): React.JSX.Element {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!confirmed) {
      setError(t('account.delete.confirmRequired'));
      return;
    }
    setError(null);
    // Preview only: no production deletion is performed or scheduled.
    setSubmitted(true);
  }

  return (
    <div className="page-content account-page account-delete-page">
      <h1>{t('account.delete.title')}</h1>
      <p className="account-page-description">{t('account.delete.explanation')}</p>

      <div className="account-preview-notice" role="note">
        <p>{t('account.previewNotice')}</p>
      </div>

      <section className="account-section" aria-labelledby="delete-consequences-heading">
        <h2 id="delete-consequences-heading">{t('account.delete.consequences')}</h2>
        <ul className="account-list">
          <li>{t('account.delete.consequence1')}</li>
          <li>{t('account.delete.consequence2')}</li>
          <li>{t('account.delete.consequence3')}</li>
          <li>{t('account.delete.consequence4')}</li>
        </ul>
      </section>

      {submitted ? (
        <p className="account-success" role="status">
          {t('account.delete.requested')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="account-delete-form">
          <label className="checkbox-label" htmlFor="delete-confirm">
            <input
              id="delete-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              aria-invalid={!!error}
              aria-describedby={error ? 'delete-confirm-error' : undefined}
            />
            {t('account.delete.confirmLabel')}
          </label>
          {error && (
            <p id="delete-confirm-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-danger">
            {t('account.delete.requestButton')}
          </button>
          <p className="account-preview-note">{t('account.delete.previewNote')}</p>
        </form>
      )}
    </div>
  );
}
