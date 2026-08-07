import { useTranslation } from 'react-i18next';
import {
  CONTENT_ORIGINS,
  isPublishableProvenance,
  type EditableProvenance,
  type ContentOriginValue,
} from '../provenanceDraft';

interface ProvenanceEditorProps {
  value: EditableProvenance;
  onChange: (next: EditableProvenance) => void;
  idPrefix: string;
  disabled?: boolean;
}

export function ProvenanceEditor({
  value,
  onChange,
  idPrefix,
  disabled = false,
}: ProvenanceEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const needsLicence = value.origin !== 'YUKCSCA_ORIGINAL';
  const incomplete = needsLicence && !isPublishableProvenance(value);

  return (
    <fieldset className="admin-fieldset" disabled={disabled}>
      <legend className="admin-fieldset-legend">{t('admin.academic.provenance.title')}</legend>
      <p className="admin-hint">{t('admin.academic.provenance.hint')}</p>

      <div>
        <label htmlFor={`${idPrefix}-origin`} className="admin-field-label">
          {t('admin.academic.provenance.origin')}
        </label>
        <select
          id={`${idPrefix}-origin`}
          className="text-input admin-field-control"
          value={value.origin}
          onChange={(e) =>
            onChange({
              ...value,
              origin: e.target.value as ContentOriginValue,
            })
          }
        >
          {CONTENT_ORIGINS.map((origin) => (
            <option key={origin} value={origin}>
              {t(`admin.academic.provenance.origins.${origin}`)}
            </option>
          ))}
        </select>
      </div>

      {needsLicence ? (
        <div className="admin-stack-sm">
          <div>
            <label htmlFor={`${idPrefix}-provider`} className="admin-field-label">
              {t('admin.academic.provenance.provider')} <span className="admin-required">*</span>
            </label>
            <input
              id={`${idPrefix}-provider`}
              type="text"
              className="text-input admin-field-control"
              value={value.provider}
              maxLength={200}
              onChange={(e) => onChange({ ...value, provider: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-source`} className="admin-field-label">
              {t('admin.academic.provenance.sourceLocator')}{' '}
              <span className="admin-required">*</span>
            </label>
            <input
              id={`${idPrefix}-source`}
              type="text"
              className="text-input admin-field-control"
              value={value.sourceLocator}
              maxLength={2000}
              onChange={(e) => onChange({ ...value, sourceLocator: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-permission`} className="admin-field-label">
              {t('admin.academic.provenance.permissionReference')}{' '}
              <span className="admin-required">*</span>
            </label>
            <input
              id={`${idPrefix}-permission`}
              type="text"
              className="text-input admin-field-control"
              value={value.permissionReference}
              maxLength={1000}
              onChange={(e) => onChange({ ...value, permissionReference: e.target.value })}
            />
          </div>
          {incomplete ? (
            <p className="admin-field-error" role="status">
              {t('admin.academic.provenance.licensedRequired')}
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
