import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { NotificationPreferences } from '@/prototype/consumer/models/types';

/**
 * Optional preference keys the user may toggle. Marketing is rendered in its own
 * section because it defaults to OFF and uses explicit opt-in language.
 */
const OPTIONAL_PREF_KEYS = [
  'inApp',
  'email',
  'learningReminders',
  'weeklyParentReport',
  'riskAlerts',
  'entitlementExpiry',
  'orderPaymentStatus',
  'supportUpdates',
] as const;

type OptionalPrefKey = (typeof OPTIONAL_PREF_KEYS)[number];

export function NotificationPrefsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state, dispatch } = useConsumer();
  const prefs = state.notificationPrefs;
  const [hasChanged, setHasChanged] = useState(false);

  function toggle(key: OptionalPrefKey | 'marketing', checked: boolean): void {
    dispatch({
      type: 'NOTIFICATION_PREFS_UPDATE',
      prefs: { [key]: checked } satisfies Partial<NotificationPreferences>,
    });
    setHasChanged(true);
  }

  return (
    <div className="page-content notification-prefs">
      <h1>{t('notifications.title')}</h1>

      <section className="notification-prefs-section" aria-labelledby="notif-essential-heading">
        <h2 id="notif-essential-heading">{t('notifications.essentialTitle')}</h2>
        <p className="notification-prefs-note">{t('notifications.essentialDesc')}</p>
        <ul className="notification-prefs-list">
          <li className="notification-prefs-row">
            <span className="notification-prefs-label" id="notif-security-label">
              {t('notifications.securityAlerts')}
            </span>
            <input
              type="checkbox"
              className="notification-prefs-toggle"
              checked
              disabled
              aria-labelledby="notif-security-label"
            />
          </li>
          <li className="notification-prefs-row">
            <span className="notification-prefs-label" id="notif-transactions-label">
              {t('notifications.transactionConfirmations')}
            </span>
            <input
              type="checkbox"
              className="notification-prefs-toggle"
              checked
              disabled
              aria-labelledby="notif-transactions-label"
            />
          </li>
        </ul>
      </section>

      <section className="notification-prefs-section" aria-labelledby="notif-optional-heading">
        <h2 id="notif-optional-heading">{t('notifications.optionalTitle')}</h2>
        <ul className="notification-prefs-list">
          {OPTIONAL_PREF_KEYS.map((key) => (
            <li className="notification-prefs-row" key={key}>
              <label className="notification-prefs-label" htmlFor={`notif-${key}`}>
                {t(`notifications.${key}`)}
              </label>
              <input
                id={`notif-${key}`}
                type="checkbox"
                className="notification-prefs-toggle"
                checked={prefs[key]}
                onChange={(event) => toggle(key, event.target.checked)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="notification-prefs-section notification-prefs-marketing"
        aria-labelledby="notif-marketing-heading"
      >
        <h2 id="notif-marketing-heading">{t('notifications.marketingTitle')}</h2>
        <p className="notification-prefs-note">{t('notifications.marketingNote')}</p>
        <div className="notification-prefs-row">
          <label className="notification-prefs-label" htmlFor="notif-marketing">
            {t('notifications.marketing')}
          </label>
          <input
            id="notif-marketing"
            type="checkbox"
            className="notification-prefs-toggle"
            checked={prefs.marketing}
            onChange={(event) => toggle('marketing', event.target.checked)}
          />
        </div>
      </section>

      <section className="notification-prefs-section" aria-labelledby="notif-whatsapp-heading">
        <h2 id="notif-whatsapp-heading">{t('notifications.whatsappTitle')}</h2>
        <div className="notification-prefs-row notification-prefs-row-disabled">
          <span className="notification-prefs-label" id="notif-whatsapp-label">
            {t('notifications.whatsapp')}
          </span>
          <input
            type="checkbox"
            className="notification-prefs-toggle"
            disabled
            aria-labelledby="notif-whatsapp-label"
            aria-describedby="notif-whatsapp-status"
          />
        </div>
        <p id="notif-whatsapp-status" className="notification-prefs-locked-note">
          {t('notifications.whatsappUnavailable')}
        </p>
      </section>

      {hasChanged && (
        <p className="notification-prefs-saved" role="status" aria-live="polite">
          {t('notifications.saved')}
        </p>
      )}
    </div>
  );
}
