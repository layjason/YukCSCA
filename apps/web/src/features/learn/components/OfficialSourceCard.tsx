import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OfficialSourcePanel } from '../types';

interface OfficialSourceCardProps {
  panel: OfficialSourcePanel;
}

export function OfficialSourceCard({ panel }: OfficialSourceCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const lastChecked = formatDate(panel.lastCheckedAt, i18n.language);

  return (
    <section className="learn-official-source" aria-labelledby="learn-official-source-heading">
      <h2 id="learn-official-source-heading">{t('learn.browse.officialSource')}</h2>
      <dl className="learn-official-source-meta">
        <div>
          <dt>{t('learn.browse.authority')}</dt>
          <dd>{panel.authority}</dd>
        </div>
        <div>
          <dt>{t('learn.browse.edition')}</dt>
          <dd>{panel.editionLabel}</dd>
        </div>
        <div>
          <dt>{t('learn.browse.lastChecked')}</dt>
          <dd>{lastChecked}</dd>
        </div>
        <div>
          <dt>{t('learn.browse.permittedUse')}</dt>
          <dd>{t(`learn.browse.permittedUseValues.${panel.permittedUse}`)}</dd>
        </div>
      </dl>
      <ul className="learn-official-source-links" role="list">
        {panel.sourceLinks.map((link) => (
          <li key={`${link.language}-${link.url}`}>
            <a
              href={link.url}
              className="btn-secondary learn-official-open"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {t('learn.browse.openOfficial', {
                language: t(`learn.browse.examLanguage.${link.language}`),
              })}
            </a>
          </li>
        ))}
      </ul>
      <p className="learn-official-source-note">{t('learn.browse.officialSourceNote')}</p>
    </section>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
