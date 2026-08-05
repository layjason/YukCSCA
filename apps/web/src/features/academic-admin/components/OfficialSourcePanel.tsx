import { useTranslation } from 'react-i18next';
import type { OfficialSyllabus } from '../types';

interface OfficialSourcePanelProps {
  syllabus: OfficialSyllabus;
  onChange: (updated: OfficialSyllabus) => void;
  isPublished?: boolean;
}

export function OfficialSourcePanel({
  syllabus,
  onChange,
  isPublished = false,
}: OfficialSourcePanelProps): React.JSX.Element {
  const { t } = useTranslation();

  const authority = syllabus.authority || 'CSCA';
  const editionLabel = syllabus.editionLabel || '2025 Edition';
  const checkedDate = syllabus.lastCheckedAt
    ? new Date(syllabus.lastCheckedAt).toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <div className={`official-source-card ${isPublished ? 'official-source-card-mint' : ''}`}>
      <div className="official-source-header">
        <div>
          <div className="official-source-meta">
            <span className="official-source-badge">{authority}</span>
            <span>·</span>
            <span>{editionLabel}</span>
            <span>·</span>
            <span>{t('admin.academic.sourcePanel.checked', { date: checkedDate })}</span>
            <span className="yukcsca-tag">{t('admin.academic.sourcePanel.title')}</span>
          </div>
          <h2 style={{ margin: 'var(--space-xs) 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
            {syllabus.subject} 2025 Syllabus
          </h2>
        </div>

        {syllabus.sourceUrl ? (
          <a
            href={syllabus.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-official-source-action"
            aria-label={`${t('admin.academic.sourcePanel.openSyllabus')} (opens in new tab)`}
          >
            <span>{t('admin.academic.sourcePanel.openSyllabus')}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
        <div>
          <label htmlFor="official-source-url" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
            {t('admin.academic.sourcePanel.sourceUrlLabel')}
          </label>
          <input
            id="official-source-url"
            type="url"
            className="text-input"
            style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
            placeholder={t('admin.academic.sourcePanel.sourceUrlPlaceholder')}
            value={syllabus.sourceUrl || ''}
            onChange={(e) => onChange({ ...syllabus, sourceUrl: e.target.value })}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-sm)',
          }}
        >
          <div>
            <label htmlFor="official-authority" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              Authority
            </label>
            <input
              id="official-authority"
              type="text"
              className="text-input"
              style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
              value={syllabus.authority || ''}
              onChange={(e) => onChange({ ...syllabus, authority: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="official-edition" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              Edition Label
            </label>
            <input
              id="official-edition"
              type="text"
              className="text-input"
              style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
              value={syllabus.editionLabel || ''}
              onChange={(e) => onChange({ ...syllabus, editionLabel: e.target.value })}
            />
          </div>

          <div>
            <label
              htmlFor="official-published-status"
              style={{ fontSize: '0.85rem', fontWeight: 650 }}
            >
              {t('admin.academic.sourcePanel.publishedOn')}
            </label>
            <select
              id="official-published-status"
              className="text-input"
              style={{ width: '100%', marginTop: 'var(--space-xxs)' }}
              value={syllabus.publishedOn?.status || 'NOT_STATED'}
              onChange={(e) =>
                onChange({
                  ...syllabus,
                  publishedOn: {
                    status: e.target.value as 'DECLARED' | 'NOT_STATED',
                    date:
                      e.target.value === 'NOT_STATED' ? null : syllabus.publishedOn?.date || null,
                  },
                })
              }
            >
              <option value="NOT_STATED">{t('admin.academic.sourcePanel.notStated')}</option>
              <option value="DECLARED">{t('admin.academic.sourcePanel.declared')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
