import { Check, Clock3, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TermSheet } from './termSheet';
import './term-practice.css';

export type TermNotebookSort = 'RECENT' | 'ALPHA';

export function TermSortControl({
  value,
  onChange,
  open,
  onOpenChange,
}: {
  value: TermNotebookSort;
  onChange: (value: TermNotebookSort) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  const options: { id: TermNotebookSort; label: string; icon: typeof List }[] = [
    { id: 'ALPHA', label: t('terminology.sortAlpha'), icon: List },
    { id: 'RECENT', label: t('terminology.sortRecent'), icon: Clock3 },
  ];

  return (
    <>
      <div className="term-sort-desktop" role="group" aria-label={t('terminology.sort')}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.id ? 'is-active' : undefined}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button type="button" className="term-sort-mobile" onClick={() => onOpenChange(true)}>
        {t('terminology.sort')}
      </button>
      {open ? (
        <TermSheet
          titleId="term-sort-title"
          title={t('terminology.sort')}
          variant="menu"
          onDismiss={() => onOpenChange(false)}
        >
          <div className="term-sheet-group">
            {options.map((option) => {
              const Icon = option.icon;
              const selected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`term-sheet-option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(option.id);
                    onOpenChange(false);
                  }}
                >
                  <span className="term-sheet-option-lead">
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    {option.label}
                  </span>
                  {selected ? <Check size={18} strokeWidth={2.25} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </TermSheet>
      ) : null}
    </>
  );
}
