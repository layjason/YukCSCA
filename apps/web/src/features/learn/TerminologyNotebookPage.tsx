import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, NotebookText } from 'lucide-react';
import { DestPageHero } from '@/shared/components/DestPageHero';
import { ApiError } from '@/shared/api/httpClient';
import { listTerminologyNotebook } from '@/shared/api/terminologyStudentApi';
import type { NotebookEntry, TermClassGroup } from '@/shared/terminology/types';
import { termClassLabelKey } from '@/shared/terminology/termPresentation';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isExplanationLanguage, type ExplanationLanguage } from './types';
import { formatMetInLine } from './termMetIn';
import './learn.css';

export function TerminologyNotebookPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [dueOnly, setDueOnly] = useState(() => searchParams.get('dueOnly') === '1');
  const [query, setQuery] = useState('');
  const [classGroup, setClassGroup] = useState<TermClassGroup | ''>('');
  const [items, setItems] = useState<NotebookEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        setExplanationLanguage(
          isExplanationLanguage(profile.defaultExplanationLanguage)
            ? profile.defaultExplanationLanguage
            : 'id',
        );
      })
      .catch(() => {
        if (active) setExplanationLanguage('id');
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!explanationLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTerminologyNotebook({
        explanationLanguage,
        ...(dueOnly ? { dueOnly: true } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(classGroup ? { classGroup } : {}),
      });
      setItems(data.items);
    } catch (err) {
      setItems(null);
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [classGroup, dueOnly, explanationLanguage, query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const firstDue = items?.find((item) => item.due);

  return (
    <div className="page-content learn-page learn-page-fill">
      <Link to="/app/learn" className="learn-back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('learn.backToLearn')}
      </Link>
      <DestPageHero icon={NotebookText} title={t('terminology.notebookTitle')} tone="cream" />

      <form
        className="term-notebook-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="term-filter-toggle">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(event) => {
              const next = event.target.checked;
              setDueOnly(next);
              setSearchParams(
                (current) => {
                  const params = new URLSearchParams(current);
                  if (next) params.set('dueOnly', '1');
                  else params.delete('dueOnly');
                  return params;
                },
                { replace: true },
              );
            }}
          />
          {t('terminology.dueOnly')}
        </label>
        <label className="term-filter-search">
          <span className="sr-only">{t('terminology.search')}</span>
          <input
            type="search"
            value={query}
            placeholder={t('terminology.searchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">{t('terminology.classFilter')}</span>
          <select
            value={classGroup}
            onChange={(event) => setClassGroup(event.target.value as TermClassGroup | '')}
          >
            <option value="">{t('terminology.classFilterAll')}</option>
            <option value="EXAM_WORDING">{t('terminology.classGroup.EXAM_WORDING')}</option>
            <option value="TOPIC_TERM">{t('terminology.classGroup.TOPIC_TERM')}</option>
          </select>
        </label>
      </form>

      {firstDue ? (
        <Link to={`/app/learn/terms/${firstDue.termId}`} className="btn-primary">
          {t('terminology.reviewDue')}
        </Link>
      ) : null}

      {loading ? <p>{t('learn.loading')}</p> : null}

      {error ? (
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('learn.retry')}
          </button>
        </section>
      ) : null}

      {!loading && !error && items && items.length === 0 && dueOnly ? (
        <section className="empty-state state-notice state-notice-info" role="status">
          <h2>{t('terminology.emptyDueTitle')}</h2>
          <p>{t('terminology.emptyDueDescription')}</p>
        </section>
      ) : null}

      {!loading && !error && items && items.length === 0 && !dueOnly ? (
        <section className="empty-state state-notice state-notice-info" role="status">
          <h2>{t('terminology.emptyNotebookTitle')}</h2>
          <p>{t('terminology.emptyNotebookDescription')}</p>
        </section>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="term-notebook-list">
          {items.map((item) => (
            <li key={item.termId}>
              <Link to={`/app/learn/terms/${item.termId}`} className="term-notebook-row">
                <span className="term-notebook-surface" lang="zh">
                  {item.primarySurface.text}
                </span>
                <span className="term-card-pinyin" aria-hidden="true">
                  {item.primarySurface.pinyin}
                </span>
                <span className="term-class-chip">{t(termClassLabelKey(item.termClass))}</span>
                {item.due ? <span className="term-due-chip">{t('terminology.due')}</span> : null}
                <span className="term-notebook-met">
                  {formatMetInLine(item.metIn, i18n.language, t)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default TerminologyNotebookPage;
