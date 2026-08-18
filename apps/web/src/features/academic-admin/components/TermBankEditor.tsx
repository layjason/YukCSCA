import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectionAfterDeleteId } from '../listSelection';
import { AdminRemoveButton } from './AdminRemoveButton';
import { useAdminNotify } from '../adminNotify';
import type { SyllabusOutlineItem, TermClass, TermDraft } from '../types';

interface TermBankEditorProps {
  terms: TermDraft[];
  outlineItems: SyllabusOutlineItem[];
  onChange: (updated: TermDraft[]) => void;
  disabled?: boolean;
}

const TERM_CLASSES: readonly TermClass[] = ['TOPIC_TERM', 'EXAM_INSTRUCTION', 'LOGICAL_EXPRESSION'];

function emptyTerm(): TermDraft {
  return {
    id: crypto.randomUUID(),
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '', pinyin: '' }],
    definitions: { indonesian: '', english: '', simplifiedChinese: '' },
    englishEquivalent: '',
    domainMeaning: '',
    outlineItemIds: [],
  };
}

export function TermBankEditor({
  terms,
  outlineItems,
  onChange,
  disabled = false,
}: TermBankEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const notify = useAdminNotify();
  const [selectedId, setSelectedId] = useState<string | null>(terms[0]?.id ?? null);
  const selected = terms.find((term) => term.id === selectedId) ?? terms[0];

  function update(next: TermDraft): void {
    onChange(terms.map((term) => (term.id === next.id ? next : term)));
  }

  return (
    <div className="admin-split-editor">
      <div className="admin-split-sidebar">
        <div className="admin-split-sidebar-header admin-split-sidebar-header-stack">
          <h3 className="admin-sidebar-title">
            {t('admin.academic.terms.title')} ({terms.length})
          </h3>
          <button
            type="button"
            className="btn-secondary admin-btn-compact"
            disabled={disabled}
            onClick={() => {
              const created = emptyTerm();
              onChange([...terms, created]);
              setSelectedId(created.id);
              notify(
                t('admin.academic.toasts.added', { name: t('admin.academic.terms.item') }),
                'success',
              );
            }}
          >
            {t('admin.academic.terms.add')}
          </button>
        </div>
        {terms.length === 0 ? (
          <p className="admin-muted">{t('admin.academic.terms.empty')}</p>
        ) : (
          <div className="admin-stack-tight">
            {terms.map((term, index) => (
              <button
                key={term.id}
                type="button"
                className={`outline-tree-item admin-list-button-bare ${term.id === selected?.id ? 'outline-tree-item-selected' : ''}`}
                onClick={() => setSelectedId(term.id)}
              >
                {term.surfaceForms[0]?.text ||
                  t('admin.academic.terms.untitled', { index: index + 1 })}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <div className="admin-stack-md">
          <div className="admin-row-between">
            <h3 className="admin-detail-title">{t('admin.academic.terms.editTitle')}</h3>
            <AdminRemoveButton
              label={t('admin.academic.terms.remove')}
              disabled={disabled}
              onClick={() => {
                const nextSelected = selectionAfterDeleteId(
                  terms.map((term) => term.id),
                  selected.id,
                );
                onChange(terms.filter((term) => term.id !== selected.id));
                setSelectedId(nextSelected);
                notify(
                  t('admin.academic.toasts.removed', { name: t('admin.academic.terms.item') }),
                  'error',
                );
              }}
            />
          </div>

          <label className="admin-field-label" htmlFor="term-class">
            {t('admin.academic.terms.termClass')}
          </label>
          <select
            id="term-class"
            className="text-input admin-field-control"
            value={selected.termClass}
            disabled={disabled}
            onChange={(event) =>
              update({ ...selected, termClass: event.target.value as TermClass })
            }
          >
            {TERM_CLASSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin.academic.terms.class.${value}`)}
              </option>
            ))}
          </select>

          {selected.surfaceForms.map((surface, index) => (
            <div key={`surface-${index}`} className="admin-row-wrap">
              <label className="admin-field-label">
                {t('admin.academic.terms.surface')}
                <input
                  className="text-input admin-field-control"
                  value={surface.text}
                  disabled={disabled}
                  onChange={(event) => {
                    const surfaceForms = [...selected.surfaceForms];
                    surfaceForms[index] = { ...surface, text: event.target.value };
                    update({ ...selected, surfaceForms });
                  }}
                />
              </label>
              <label className="admin-field-label">
                {t('admin.academic.terms.pinyin')}
                <input
                  className="text-input admin-field-control"
                  value={surface.pinyin}
                  disabled={disabled}
                  onChange={(event) => {
                    const surfaceForms = [...selected.surfaceForms];
                    surfaceForms[index] = { ...surface, pinyin: event.target.value };
                    update({ ...selected, surfaceForms });
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary admin-btn-compact"
            disabled={disabled}
            onClick={() =>
              update({
                ...selected,
                surfaceForms: [...selected.surfaceForms, { text: '', pinyin: '' }],
              })
            }
          >
            {t('admin.academic.terms.addSurface')}
          </button>

          {(
            [
              ['indonesian', t('admin.academic.outline.summaryId')],
              ['english', t('admin.academic.outline.summaryEn')],
              ['simplifiedChinese', t('admin.academic.outline.summaryZh')],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="admin-field-label">
              {label}
              <input
                className="text-input admin-field-control"
                value={selected.definitions[field] || ''}
                disabled={disabled}
                onChange={(event) =>
                  update({
                    ...selected,
                    definitions: { ...selected.definitions, [field]: event.target.value },
                  })
                }
              />
            </label>
          ))}

          <label className="admin-field-label">
            {t('admin.academic.terms.englishEquivalent')}
            <input
              className="text-input admin-field-control"
              value={selected.englishEquivalent}
              disabled={disabled}
              onChange={(event) => update({ ...selected, englishEquivalent: event.target.value })}
            />
          </label>
          <label className="admin-field-label">
            {t('admin.academic.terms.domainMeaning')}
            <textarea
              className="text-input admin-field-control-resize"
              value={selected.domainMeaning}
              disabled={disabled}
              onChange={(event) => update({ ...selected, domainMeaning: event.target.value })}
            />
          </label>
          <label className="admin-field-label">
            {t('admin.academic.terms.symbols')}
            <input
              className="text-input admin-field-control"
              value={selected.symbols ?? ''}
              disabled={disabled}
              onChange={(event) =>
                update({
                  ...selected,
                  symbols: event.target.value.trim() ? event.target.value : null,
                })
              }
            />
          </label>
          <label className="admin-field-label">
            {t('admin.academic.terms.example')}
            <textarea
              className="text-input admin-field-control-resize"
              value={selected.example ?? ''}
              disabled={disabled}
              onChange={(event) =>
                update({
                  ...selected,
                  example: event.target.value.trim() ? event.target.value : null,
                })
              }
            />
          </label>

          {selected.termClass === 'TOPIC_TERM' ? (
            <fieldset className="admin-fieldset" disabled={disabled}>
              <legend className="admin-fieldset-legend">
                {t('admin.academic.terms.outlineRefs')}
              </legend>
              {outlineItems.map((item) => {
                const label =
                  item.summary.english ||
                  item.summary.indonesian ||
                  item.summary.simplifiedChinese ||
                  item.id;
                return (
                  <label key={item.id} className="admin-check-row">
                    <input
                      type="checkbox"
                      checked={selected.outlineItemIds.includes(item.id)}
                      onChange={(event) => {
                        const outlineItemIds = event.target.checked
                          ? [...selected.outlineItemIds, item.id]
                          : selected.outlineItemIds.filter((id) => id !== item.id);
                        update({ ...selected, outlineItemIds });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
