import { useTranslation } from 'react-i18next';
import { accessItems } from '@/prototype/student/fixtures';

export function AccessPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="page-content">
      <h1>{t('settings.accessTitle')}</h1>
      <p className="task-meta">{t('settings.access.trialStatus')}</p>

      <ul className="access-list" role="list">
        {accessItems.map((item) => (
          <li key={item.id} className={`access-item access-${item.level}`}>
            <span className="access-name">{t(item.name)}</span>
            <span className={`access-badge badge-${item.level}`}>
              {t(`settings.access.${item.level}`)}
            </span>
            {item.reason && <p className="access-reason">{t(item.reason)}</p>}
          </li>
        ))}
      </ul>

      <section className="settings-section">
        <h2>{t('settings.access.purchaseTitle')}</h2>
        <p>{t('settings.access.purchasePurpose')}</p>
        <p className="task-meta">{t('settings.access.purchaseStatus')}</p>
        <p>{t('settings.access.noCheckout')}</p>
      </section>
    </div>
  );
}
