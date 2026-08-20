import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, NotebookText } from 'lucide-react';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';

export function LearnNotebookEntry({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const title = t('terminology.notebookTitle');
  const state = notebookStateFrom(`${location.pathname}${location.search}`);

  if (compact) {
    return (
      <Link to="/app/learn/terms" state={state} className="learn-notebook-chrome">
        <NotebookText size={18} strokeWidth={1.75} aria-hidden="true" />
        {title}
      </Link>
    );
  }

  return (
    <Link to="/app/learn/terms" state={state} className="learn-notebook-entry">
      <span className="learn-notebook-entry-mark" aria-hidden="true">
        <span className="learn-notebook-entry-leaf" />
        <NotebookText size={24} strokeWidth={1.75} />
      </span>
      <span className="learn-notebook-entry-copy">
        <span className="learn-notebook-entry-title">{title}</span>
        <span className="learn-notebook-entry-lead">{t('learn.notebookEntryLead')}</span>
      </span>
      <span className="learn-notebook-entry-go">
        {t('learn.openNotebook')}
        <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}
