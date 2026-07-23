import { useTranslation } from 'react-i18next';

export function FamilyPage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="page-content">
      <h1>{t('settings.familyTitle')}</h1>

      <section className="settings-section">
        <p>{t('settings.family.noParent')}</p>
        <div className="signpost">
          <strong>{t('settings.family.inviteEntry')}</strong>
          <p>{t('settings.family.invitePurpose')}</p>
          <span>{t('settings.family.inviteStatus')}</span>
        </div>
        <div className="signpost">
          <strong>{t('settings.family.unlinkEntry')}</strong>
          <p>{t('settings.family.unlinkPurpose')}</p>
          <span>{t('settings.family.unlinkStatus')}</span>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="parent-may-see">
        <h2 id="parent-may-see">{t('settings.family.parentMaySee')}</h2>
        <p>{t('settings.family.parentMaySeeList')}</p>
      </section>

      <section className="settings-section" aria-labelledby="parent-cannot-see">
        <h2 id="parent-cannot-see">{t('settings.family.parentCannotSee')}</h2>
        <p>{t('settings.family.parentCannotSeeList')}</p>
      </section>

      <section className="settings-section privacy-note-section">
        <p className="privacy-note">{t('settings.family.privacyNote')}</p>
      </section>
    </div>
  );
}
