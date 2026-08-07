import { useTranslation } from 'react-i18next';
import {
  normalizeOfficialDate,
  normalizeOfficialSyllabus,
  notStatedOfficialDate,
} from '../officialSyllabusNormalize';
import { ensureExamStructure } from '../subjectProfile';
import type { OfficialFieldKey } from '../validationMapping';
import type { ExamLanguage, OfficialSyllabus } from '../types';

interface OfficialSourcePanelProps {
  syllabus: OfficialSyllabus;
  onChange: (updated: OfficialSyllabus) => void;
  isPublished?: boolean;
  fieldErrors?: Partial<Record<OfficialFieldKey, string | string[]>>;
}

function joinFieldError(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(' ') : value;
}

type OfficialDateStatus = 'DECLARED' | 'NOT_STATED';

function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function OfficialSourcePanel({
  syllabus,
  onChange,
  isPublished = false,
  fieldErrors = {},
}: OfficialSourcePanelProps): React.JSX.Element {
  const { t } = useTranslation();

  // Always work with explicit official dates so UI and wire payload stay aligned.
  const normalized = normalizeOfficialSyllabus(syllabus);

  const authority = normalized.authority || 'CSCA';
  const editionLabel = normalized.editionLabel || '2025 Edition';
  const checkedDate = normalized.lastCheckedAt
    ? new Date(normalized.lastCheckedAt).toLocaleDateString()
    : t('admin.academic.sourcePanel.notCheckedYet');
  const sourceLanguages = normalized.sourceLanguages ?? [];
  const examLanguages = normalized.examStructure?.examLanguages ?? [];

  const patch = (partial: OfficialSyllabus) => onChange(normalizeOfficialSyllabus(partial));

  const setOfficialDate = (
    field: 'publishedOn' | 'effectiveOn' | 'updatedOn',
    status: OfficialDateStatus,
    date?: string | null,
  ) => {
    const nextDate =
      status === 'NOT_STATED'
        ? notStatedOfficialDate()
        : normalizeOfficialDate({
            status: 'DECLARED',
            date: date ?? normalized[field]?.date ?? null,
          });
    patch({
      ...normalized,
      [field]: nextDate,
    });
  };

  const fieldError = (key: OfficialFieldKey) => joinFieldError(fieldErrors[key]);

  const toggleLanguage = (
    field: 'sourceLanguages' | 'examLanguages',
    language: ExamLanguage,
    checked: boolean,
  ) => {
    if (field === 'sourceLanguages') {
      const current = new Set(sourceLanguages);
      if (checked) current.add(language);
      else current.delete(language);
      patch({ ...normalized, sourceLanguages: Array.from(current) as ExamLanguage[] });
      return;
    }
    const current = new Set(examLanguages);
    if (checked) current.add(language);
    else current.delete(language);
    const structure = ensureExamStructure(normalized);
    patch({
      ...normalized,
      examStructure: {
        ...structure,
        examLanguages: Array.from(current) as ExamLanguage[],
      },
    });
  };

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
          <h2 className="official-source-heading">
            {t('admin.academic.sourcePanel.subjectHeading', { subject: normalized.subject })}
          </h2>
        </div>

        {normalized.sourceUrl ? (
          <a
            href={normalized.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-official-source-action"
            aria-label={`${t('admin.academic.sourcePanel.openSyllabus')} (${t('admin.academic.sourcePanel.opensInNewTab')})`}
          >
            <span>{t('admin.academic.sourcePanel.openSyllabus')}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      <div className="official-source-body">
        <div>
          <label htmlFor="official-source-url" className="admin-field-label">
            {t('admin.academic.sourcePanel.sourceUrlLabel')}
          </label>
          <input
            id="official-source-url"
            type="url"
            className="text-input admin-field-control"
            placeholder={t('admin.academic.sourcePanel.sourceUrlPlaceholder')}
            value={normalized.sourceUrl || ''}
            onChange={(e) => patch({ ...normalized, sourceUrl: e.target.value })}
            aria-invalid={fieldError('sourceUrl') ? true : undefined}
          />
          {fieldError('sourceUrl') ? (
            <p className="admin-field-error" role="alert">
              {fieldError('sourceUrl')}
            </p>
          ) : null}
        </div>

        <div className="admin-grid-auto">
          <div>
            <label htmlFor="official-authority" className="admin-field-label">
              {t('admin.academic.sourcePanel.authorityLabel')}
            </label>
            <input
              id="official-authority"
              type="text"
              className="text-input admin-field-control"
              value={normalized.authority || ''}
              onChange={(e) => patch({ ...normalized, authority: e.target.value })}
              aria-invalid={fieldError('authority') ? true : undefined}
            />
            {fieldError('authority') ? (
              <p className="admin-field-error" role="alert">
                {fieldError('authority')}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="official-edition" className="admin-field-label">
              {t('admin.academic.sourcePanel.editionLabel')}
            </label>
            <input
              id="official-edition"
              type="text"
              className="text-input admin-field-control"
              value={normalized.editionLabel || ''}
              onChange={(e) => patch({ ...normalized, editionLabel: e.target.value })}
              aria-invalid={fieldError('editionLabel') ? true : undefined}
            />
            {fieldError('editionLabel') ? (
              <p className="admin-field-error" role="alert">
                {fieldError('editionLabel')}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="official-permitted-use" className="admin-field-label">
              {t('admin.academic.sourcePanel.permittedUse')}
            </label>
            <select
              id="official-permitted-use"
              className="text-input admin-field-control"
              value={normalized.permittedUse || 'REFERENCE_ONLY'}
              onChange={(e) =>
                patch({
                  ...normalized,
                  permittedUse: e.target.value as 'REFERENCE_ONLY',
                })
              }
              aria-invalid={fieldError('permittedUse') ? true : undefined}
            >
              <option value="REFERENCE_ONLY">
                {t('admin.academic.sourcePanel.referenceOnly')}
              </option>
            </select>
            {fieldError('permittedUse') ? (
              <p className="admin-field-error" role="alert">
                {fieldError('permittedUse')}
              </p>
            ) : null}
          </div>
        </div>

        <div className="admin-grid-auto-md">
          <div>
            <label htmlFor="official-retrieved-at" className="admin-field-label">
              {t('admin.academic.sourcePanel.retrievedAt')}
            </label>
            <input
              id="official-retrieved-at"
              type="datetime-local"
              className="text-input admin-field-control"
              value={toDatetimeLocalValue(normalized.retrievedAt)}
              onChange={(e) => {
                const retrievedAt = fromDatetimeLocalValue(e.target.value);
                if (!retrievedAt) {
                  const { retrievedAt: _removed, ...rest } = normalized;
                  void _removed;
                  patch(rest);
                  return;
                }
                patch({ ...normalized, retrievedAt });
              }}
              aria-invalid={fieldError('retrievedAt') ? true : undefined}
            />
            {fieldError('retrievedAt') ? (
              <p className="admin-field-error" role="alert">
                {fieldError('retrievedAt')}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="official-last-checked-at" className="admin-field-label">
              {t('admin.academic.sourcePanel.lastCheckedAt')}
            </label>
            <input
              id="official-last-checked-at"
              type="datetime-local"
              className="text-input admin-field-control"
              value={toDatetimeLocalValue(normalized.lastCheckedAt)}
              onChange={(e) => {
                const lastCheckedAt = fromDatetimeLocalValue(e.target.value);
                if (!lastCheckedAt) {
                  const { lastCheckedAt: _removed, ...rest } = normalized;
                  void _removed;
                  patch(rest);
                  return;
                }
                patch({ ...normalized, lastCheckedAt });
              }}
              aria-invalid={fieldError('lastCheckedAt') ? true : undefined}
            />
            {fieldError('lastCheckedAt') ? (
              <p className="admin-field-error" role="alert">
                {fieldError('lastCheckedAt')}
              </p>
            ) : null}
          </div>
        </div>

        {(
          [
            ['publishedOn', t('admin.academic.sourcePanel.publishedOn')],
            ['effectiveOn', t('admin.academic.sourcePanel.effectiveOn')],
            ['updatedOn', t('admin.academic.sourcePanel.updatedOn')],
          ] as const
        ).map(([field, label]) => {
          const current = normalized[field] ?? notStatedOfficialDate();
          const status = (current.status || 'NOT_STATED') as OfficialDateStatus;
          const error = fieldError(field);
          return (
            <div key={field} className="admin-official-date-block">
              <div className="admin-grid-date">
                <div>
                  <label htmlFor={`official-${field}-status`} className="admin-field-label">
                    {label}
                  </label>
                  <select
                    id={`official-${field}-status`}
                    className="text-input admin-field-control"
                    value={status}
                    onChange={(e) =>
                      setOfficialDate(field, e.target.value as OfficialDateStatus, current.date)
                    }
                    aria-invalid={error ? true : undefined}
                  >
                    <option value="NOT_STATED">{t('admin.academic.sourcePanel.notStated')}</option>
                    <option value="DECLARED">{t('admin.academic.sourcePanel.declared')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`official-${field}-date`} className="admin-field-label">
                    {t('admin.academic.sourcePanel.declaredDate')}
                  </label>
                  <input
                    id={`official-${field}-date`}
                    type="date"
                    className="text-input admin-field-control"
                    disabled={status !== 'DECLARED'}
                    value={status === 'DECLARED' && current.date ? current.date : ''}
                    onChange={(e) => setOfficialDate(field, 'DECLARED', e.target.value || null)}
                    aria-invalid={error ? true : undefined}
                  />
                </div>
              </div>
              {error ? (
                <p className="admin-field-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}

        <fieldset className="admin-fieldset">
          <legend className="admin-fieldset-legend">
            {t('admin.academic.sourcePanel.sourceLanguages')}
          </legend>
          <div className="admin-check-row-inline">
            {(['en', 'zh-CN'] as ExamLanguage[]).map((language) => (
              <label key={language} className="admin-check-row">
                <input
                  type="checkbox"
                  checked={sourceLanguages.includes(language)}
                  onChange={(e) => toggleLanguage('sourceLanguages', language, e.target.checked)}
                />
                <span>
                  {language === 'en'
                    ? t('admin.academic.questions.examLangEn')
                    : t('admin.academic.questions.examLangZh')}
                </span>
              </label>
            ))}
          </div>
          {fieldError('sourceLanguages') ? (
            <p className="admin-field-error" role="alert">
              {fieldError('sourceLanguages')}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend className="admin-fieldset-legend">
            {t('admin.academic.sourcePanel.examStructure')}
          </legend>
          <p className="admin-muted-sm">{t('admin.academic.sourcePanel.examStructureFixed')}</p>
          <div className="admin-check-row-inline">
            {(['en', 'zh-CN'] as ExamLanguage[]).map((language) => (
              <label key={language} className="admin-check-row">
                <input
                  type="checkbox"
                  checked={examLanguages.includes(language)}
                  onChange={(e) => toggleLanguage('examLanguages', language, e.target.checked)}
                />
                <span>
                  {language === 'en'
                    ? t('admin.academic.questions.examLangEn')
                    : t('admin.academic.questions.examLangZh')}
                </span>
              </label>
            ))}
          </div>
          {fieldError('examStructure') ? (
            <p className="admin-field-error" role="alert">
              {fieldError('examStructure')}
            </p>
          ) : null}
        </fieldset>
      </div>
    </div>
  );
}
