import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, NotebookText } from 'lucide-react';
import { DestPageHero } from '@/shared/components/DestPageHero';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { listTerminologyNotebook, unbookmarkTerm } from '@/shared/api/terminologyStudentApi';
import type { NotebookEntry } from '@/shared/terminology/types';
import { TermLexemeRow } from '@/shared/terminology/TermLexemeRow';
import { TermSearchField } from '@/shared/terminology/TermSearchField';
import { TermSortControl, type TermNotebookSort } from '@/shared/terminology/TermSortControl';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { isExplanationLanguage, type ExplanationLanguage } from './types';
import { formatMetInLine } from './termMetIn';
import { notebookBackLabelKey, notebookReturnTo } from '@/shared/terminology/notebookReturn';
import './learn.css';

const PAGE_SIZE = 20;

export function TerminologyNotebookPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [dueOnly, setDueOnly] = useState(() => searchParams.get('dueOnly') === '1');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<TermNotebookSort>('RECENT');
  const [sortOpen, setSortOpen] = useState(false);
  const [items, setItems] = useState<NotebookEntry[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unbookmarkBusy, setUnbookmarkBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const audio = useTermAudio();

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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (!explanationLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTerminologyNotebook({
        explanationLanguage,
        limit: PAGE_SIZE,
        ...(dueOnly ? { dueOnly: true } : {}),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
      });
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setItems(null);
      setNextCursor(null);
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [dueOnly, explanationLanguage, debouncedQuery, t]);

  const loadMore = useCallback(async () => {
    if (!explanationLanguage || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listTerminologyNotebook({
        explanationLanguage,
        cursor: nextCursor,
        limit: PAGE_SIZE,
        ...(dueOnly ? { dueOnly: true } : {}),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
      });
      setItems((current) => [...(current ?? []), ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setError(t('terminology.loadFailed'));
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedQuery, dueOnly, explanationLanguage, loadingMore, nextCursor, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnbookmark(termId: string): Promise<void> {
    if (unbookmarkBusy) return;
    setUnbookmarkBusy(termId);
    setError(null);
    try {
      await unbookmarkTerm(termId);
      setItems((current) => current?.filter((item) => item.termId !== termId) ?? current);
      setToast({ message: t('terminology.unbookmarkedToast'), tone: 'info' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setError(t('terminology.formalDisabled'));
      } else {
        setError(t('terminology.saveFailed'));
      }
    } finally {
      setUnbookmarkBusy(null);
    }
  }

  const origin = notebookReturnTo(location.state, '');
  const firstDue = items?.find((item) => item.due);
  const visibleItems = useMemo(() => {
    if (!items) return [];
    if (sort !== 'ALPHA') return items;
    return [...items].sort((left, right) =>
      left.primarySurface.text.localeCompare(right.primarySurface.text, 'zh'),
    );
  }, [items, sort]);

  return (
    <div className="page-content learn-page learn-page-fill">
      <button
        type="button"
        className="learn-back-link"
        onClick={() => {
          if (origin) navigate(-1);
          else navigate('/app/learn');
        }}
      >
        <ArrowLeft size={18} aria-hidden="true" />
        {origin ? t(notebookBackLabelKey(origin)) : t('learn.backToLearn')}
      </button>
      <DestPageHero icon={NotebookText} title={t('terminology.notebookTitle')} tone="cream" />

      <div className="term-notebook-toolbar">
        <TermSearchField value={query} onChange={setQuery} />
        <div className="term-notebook-meta">
          <p className="term-notebook-count">
            {items ? t('terminology.wordCount', { count: visibleItems.length }) : '\u00a0'}
          </p>
          <TermSortControl
            value={sort}
            onChange={setSort}
            open={sortOpen}
            onOpenChange={setSortOpen}
          />
        </div>
      </div>
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

      {firstDue ? (
        <div className="term-notebook-due">
          <Link
            to={`/app/learn/terms/${firstDue.termId}`}
            state={location.state}
            className="btn-primary"
          >
            {t('terminology.reviewDue')}
          </Link>
        </div>
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
        <div className="term-notebook-sheet">
          <ul className="term-notebook-list">
            {visibleItems.map((item) => (
              <li key={item.termId}>
                <TermLexemeRow
                  surface={item.primarySurface.text}
                  subtitle={item.primarySurface.pinyin}
                  meta={[
                    item.due ? t('terminology.due') : null,
                    formatMetInLine(item.metIn, i18n.language, t),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  href={`/app/learn/terms/${item.termId}`}
                  linkState={location.state}
                  audioAvailable={item.primarySurface.audioAvailable}
                  playing={
                    audio.playingTermId === item.termId &&
                    audio.playingSurface === item.primarySurface.text
                  }
                  onPlay={
                    item.primarySurface.audioAvailable
                      ? () => void audio.play(item.termId, item.primarySurface.text)
                      : undefined
                  }
                  onUnbookmark={() => void handleUnbookmark(item.termId)}
                  unbookmarkBusy={unbookmarkBusy === item.termId}
                />
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <button
              type="button"
              className="term-load-more"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {t('terminology.loadMore')}
              <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

export default TerminologyNotebookPage;
