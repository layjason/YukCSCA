import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './term-practice.css';

export function TermSearchField({
  value,
  onChange,
  id = 'term-search',
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="term-search-field">
      <Search size={18} strokeWidth={2} aria-hidden="true" />
      <label className="sr-only" htmlFor={id}>
        {t('terminology.search')}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={t('terminology.searchPlaceholder')}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="term-search-clear"
          onClick={() => onChange('')}
          aria-label={t('terminology.searchClear')}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
