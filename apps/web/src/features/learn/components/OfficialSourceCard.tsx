import { BookMarked, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatLearnDate } from '../formatLearnDate';
import type { OfficialSourcePanel } from '../types';

interface OfficialSourceCardProps {
  panel: OfficialSourcePanel;
}

export function OfficialSourceCard({ panel }: OfficialSourceCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lastChecked = formatLearnDate(panel.lastCheckedAt, i18n.language);

  return (
    <section className="learn-official-source" aria-labelledby="learn-official-source-heading">
      <header className="learn-official-source-header">
        <span className="learn-official-source-icon" aria-hidden="true">
          <BookMarked size={20} strokeWidth={1.75} />
        </span>
        <div>
          <p className="learn-official-eyebrow">{t('learn.browse.officialSourceEyebrow')}</p>
          <h2 id="learn-official-source-heading">{t('learn.browse.officialSource')}</h2>
        </div>
      </header>

      <p className="learn-official-authority">{panel.authority}</p>

      <dl className="learn-official-source-meta">
        <div className="learn-official-meta-item">
          <dt>{t('learn.browse.edition')}</dt>
          <dd>{panel.editionLabel}</dd>
        </div>
        <div className="learn-official-meta-item">
          <dt>{t('learn.browse.lastChecked')}</dt>
          <dd>{lastChecked}</dd>
        </div>
        <div className="learn-official-meta-item learn-official-meta-span">
          <dt>{t('learn.browse.permittedUse')}</dt>
          <dd>
            <span className="learn-official-use-chip">
              {t(`learn.browse.permittedUseValues.${panel.permittedUse}`)}
            </span>
          </dd>
        </div>
      </dl>

      <ul className="learn-official-source-links" role="list">
        {panel.sourceLinks.map((link) => {
          const languageLabel = t(`learn.browse.examLanguage.${link.language}`);
          const languageCode = link.language === 'zh-CN' ? '中文' : 'EN';
          return (
            <li key={`${link.language}-${link.url}`}>
              <a
                href={link.url}
                className="learn-official-open"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="learn-official-lang-badge" aria-hidden="true">
                  {languageCode}
                </span>
                <span className="learn-official-open-copy">
                  <span className="learn-official-open-title">
                    {t('learn.browse.openOfficialTitle', { language: languageLabel })}
                  </span>
                  <span className="learn-official-open-sub">
                    {t('learn.browse.openOfficialSub')}
                  </span>
                </span>
                <ExternalLink
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="learn-official-open-icon"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
