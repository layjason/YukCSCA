import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  NotebookText,
  Volume2,
} from 'lucide-react';
import {
  bookmarkTerm,
  resolveTermLookup,
  unbookmarkTerm,
} from '@/shared/api/terminologyStudentApi';
import { TermBookmarkIcon } from '@/shared/terminology/TermBookmarkIcon';
import { TermCardDialog } from '@/shared/terminology/TermCardDialog';
import { TermCardView } from '@/shared/terminology/TermCardView';
import { useTermAudio } from '@/shared/terminology/useTermAudio';
import { termDefinitionText } from '@/shared/terminology/termPresentation';
import type { TermCard } from '@/shared/terminology/types';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import type { AcademicSubject, ExplanationLanguage } from '../types';
import { formatMetInLine } from '../termMetIn';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';

const PAGE_SIZE = 5;

interface LessonTermRailProps {
  subject: AcademicSubject;
  resourceId: string;
  explanationLanguage: ExplanationLanguage;
  rail: readonly TermCard[];
}

export function LessonTermRail({
  subject,
  resourceId,
  explanationLanguage,
  rail,
}: LessonTermRailProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [resolvedCards, setResolvedCards] = useState<Record<string, TermCard>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const card of rail) {
      map[card.termId] = card.alreadyInNotebook;
    }
    return map;
  });
  const [metInMap, setMetInMap] = useState<Record<string, string | null>>({});
  const [mobileDialogOpen, setMobileDialogOpen] = useState<TermCard | null>(null);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const audio = useTermAudio();

  const totalPages = Math.max(1, Math.ceil(rail.length / PAGE_SIZE));

  // Sync page if out of range
  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  // Sync initial bookmark status from rail prop changes
  useEffect(() => {
    setBookmarkedMap((prev) => {
      const next = { ...prev };
      for (const card of rail) {
        if (next[card.termId] === undefined) {
          next[card.termId] = card.alreadyInNotebook;
        }
      }
      return next;
    });
  }, [rail]);

  const loadResolvedCard = useCallback(
    async (card: TermCard): Promise<void> => {
      if (resolvedCards[card.termId]) return;
      try {
        const result = await resolveTermLookup({
          subject,
          explanationLanguage,
          source: 'LESSON',
          termId: card.termId,
          resourceId,
        });
        if (result.outcome === 'MATCHED') {
          setResolvedCards((prev) => ({ ...prev, [card.termId]: result.card }));
          setBookmarkedMap((prev) => ({ ...prev, [card.termId]: result.alreadyInNotebook }));
          if (result.entry) {
            setMetInMap((prev) => ({
              ...prev,
              [card.termId]: formatMetInLine(result.entry!.metIn, i18n.language, t),
            }));
          }
        }
      } catch {
        // Fallback to rail card data
      }
    },
    [explanationLanguage, i18n.language, resourceId, resolvedCards, subject, t],
  );

  const handleSelectTerm = useCallback(
    (index: number) => {
      const targetCard = rail[index];
      if (!targetCard) return;
      setError(null);

      // Keep page in sync with selected term
      setPage(Math.floor(index / PAGE_SIZE));

      const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(max-width: 959px)').matches;

      if (isMobile) {
        setMobileDialogOpen(targetCard);
        void loadResolvedCard(targetCard);
      } else {
        setSelectedIndex(index);
        void loadResolvedCard(targetCard);
      }
    },
    [loadResolvedCard, rail],
  );

  const handleToggleBookmark = useCallback(
    async (termId: string, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }
      if (bookmarkBusy) return;
      setBookmarkBusy(true);
      setError(null);
      const isSaved = Boolean(bookmarkedMap[termId]);
      const nextSaved = !isSaved;

      try {
        if (nextSaved) {
          await bookmarkTerm(termId, {
            subject,
            explanationLanguage,
            source: 'LESSON',
            resourceId,
          });
          setBookmarkedMap((prev) => ({ ...prev, [termId]: true }));
          setToast({ message: t('terminology.bookmarkedToast'), tone: 'success' });
        } else {
          await unbookmarkTerm(termId);
          setBookmarkedMap((prev) => ({ ...prev, [termId]: false }));
          setToast({ message: t('terminology.unbookmarkedToast'), tone: 'info' });
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === 'FORMAL_ASSISTANCE_DISABLED') {
          setError(t('terminology.formalDisabled'));
        } else {
          setError(t('terminology.saveFailed'));
        }
      } finally {
        setBookmarkBusy(false);
      }
    },
    [bookmarkedMap, bookmarkBusy, explanationLanguage, resourceId, subject, t],
  );

  const handlePlay = useCallback(
    (termId: string, surfaceText: string, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }
      void audio.play(termId, surfaceText);
    },
    [audio],
  );

  // Keyboard navigation when inspector is active in rail
  useEffect(() => {
    if (selectedIndex === null) return;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft' && selectedIndex! > 0) {
        e.preventDefault();
        handleSelectTerm(selectedIndex! - 1);
      } else if (e.key === 'ArrowRight' && selectedIndex! < rail.length - 1) {
        e.preventDefault();
        handleSelectTerm(selectedIndex! + 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectTerm, rail.length, selectedIndex]);

  const activeCard =
    selectedIndex !== null && rail[selectedIndex]
      ? (resolvedCards[rail[selectedIndex]!.termId] ?? rail[selectedIndex]!)
      : null;

  const paginatedTerms = useMemo(() => {
    const start = page * PAGE_SIZE;
    return rail.slice(start, start + PAGE_SIZE).map((card, offset) => ({
      card,
      globalIndex: start + offset,
    }));
  }, [page, rail]);

  return (
    <aside className="term-rail" aria-labelledby="term-rail-heading">
      {selectedIndex !== null && activeCard ? (
        /* In-Rail Term Inspector View */
        <div
          className="term-rail-inspector"
          role="region"
          aria-label={activeCard.primarySurface.text}
        >
          <div className="term-rail-inspector-nav">
            <button
              type="button"
              className="term-rail-back-btn"
              onClick={() => setSelectedIndex(null)}
              aria-label={t('terminology.allTerms')}
              title={t('terminology.allTerms')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{t('terminology.allTerms')}</span>
            </button>

            <div
              className="term-rail-stepper"
              aria-label={t('terminology.termCounter', {
                current: selectedIndex + 1,
                total: rail.length,
              })}
            >
              <button
                type="button"
                className="term-rail-step-btn"
                disabled={selectedIndex === 0}
                onClick={() => handleSelectTerm(selectedIndex - 1)}
                aria-label={t('terminology.prevTerm')}
                title={t('terminology.prevTerm')}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="term-rail-step-count" aria-hidden="true">
                {`${selectedIndex + 1} / ${rail.length}`}
              </span>
              <button
                type="button"
                className="term-rail-step-btn"
                disabled={selectedIndex === rail.length - 1}
                onClick={() => handleSelectTerm(selectedIndex + 1)}
                aria-label={t('terminology.nextTerm')}
                title={t('terminology.nextTerm')}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              className={`term-card-bookmark${bookmarkedMap[activeCard.termId] ? ' is-on' : ''}`}
              aria-pressed={Boolean(bookmarkedMap[activeCard.termId])}
              aria-label={
                bookmarkedMap[activeCard.termId]
                  ? t('terminology.unbookmarkAria', { text: activeCard.primarySurface.text })
                  : t('terminology.bookmarkAria', { text: activeCard.primarySurface.text })
              }
              title={
                bookmarkedMap[activeCard.termId]
                  ? t('terminology.unbookmarkAria', { text: activeCard.primarySurface.text })
                  : t('terminology.bookmarkAria', { text: activeCard.primarySurface.text })
              }
              disabled={bookmarkBusy}
              onClick={() => void handleToggleBookmark(activeCard.termId)}
            >
              <TermBookmarkIcon marked={Boolean(bookmarkedMap[activeCard.termId])} size={20} />
            </button>
          </div>

          <div className="term-rail-inspector-card">
            <TermCardView
              layout="rail"
              card={activeCard}
              alreadyInNotebook={Boolean(bookmarkedMap[activeCard.termId])}
              bookmarked={Boolean(bookmarkedMap[activeCard.termId])}
              metInLine={metInMap[activeCard.termId]}
              onPlay={
                (activeCard.primarySurface.audioAvailable ||
                  activeCard.aliases.some((a) => a.audioAvailable)) &&
                !audio.playFailed
                  ? (surface) => {
                      void audio.play(activeCard.termId, surface);
                    }
                  : undefined
              }
              playingSurface={
                audio.playingTermId === activeCard.termId ? audio.playingSurface : null
              }
              playFailed={audio.playFailed && audio.playingTermId === activeCard.termId}
              hideSavedNote
            />
          </div>
        </div>
      ) : (
        /* Glossary List View */
        <>
          <div className="term-rail-header">
            <div className="term-rail-title-row">
              <div className="term-rail-title-badge">
                <BookOpen size={17} className="term-rail-title-icon" aria-hidden="true" />
                <h2 id="term-rail-heading" className="term-rail-heading">
                  {t('terminology.railTitle')}
                </h2>
                {rail.length > 0 ? (
                  <span
                    className="term-rail-count-pill"
                    aria-label={t('terminology.wordCount', { count: rail.length })}
                  >
                    {rail.length}
                  </span>
                ) : null}
              </div>

              <Link
                to="/app/learn/terms"
                state={notebookStateFrom(`${location.pathname}${location.search}`)}
                className="term-rail-notebook-btn"
                title={t('terminology.myNotebook')}
                aria-label={t('terminology.myNotebook')}
              >
                <NotebookText size={15} aria-hidden="true" />
                <span>{t('terminology.myNotebook')}</span>
              </Link>
            </div>
          </div>

          {rail.length === 0 ? (
            <p className="term-rail-empty">{t('terminology.railEmpty')}</p>
          ) : (
            <>
              <ul className={`term-rail-list${totalPages > 1 ? ' is-paginated' : ''}`}>
                {paginatedTerms.map(({ card, globalIndex }) => {
                  const isBookmarked = Boolean(bookmarkedMap[card.termId]);
                  const unavailable = t('terminology.definitionUnavailable');
                  const defText = termDefinitionText(card.definition, unavailable);
                  const glossPreview =
                    card.definition.availability === 'AVAILABLE'
                      ? defText
                      : card.englishEquivalent || unavailable;

                  return (
                    <li key={card.termId} className="term-rail-list-item">
                      <div
                        className="term-rail-card term-rail-item"
                        onClick={() => handleSelectTerm(globalIndex)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTerm(globalIndex);
                          }
                        }}
                        aria-label={`${card.primarySurface.text}, ${card.primarySurface.pinyin}. ${glossPreview}`}
                      >
                        <div className="term-rail-card-top">
                          <div className="term-rail-card-head">
                            <span className="term-rail-card-hanzi" lang="zh">
                              {card.primarySurface.text}
                            </span>
                            {card.primarySurface.pinyin ? (
                              <span className="term-rail-card-pinyin" aria-hidden="true">
                                {card.primarySurface.pinyin}
                              </span>
                            ) : null}
                          </div>

                          <div className="term-rail-card-actions">
                            {card.primarySurface.audioAvailable && !audio.playFailed ? (
                              <button
                                type="button"
                                className={`term-rail-card-audio${
                                  audio.playingTermId === card.termId ? ' is-playing' : ''
                                }`}
                                onClick={(e) =>
                                  handlePlay(card.termId, card.primarySurface.text, e)
                                }
                                aria-label={t('terminology.playAria', {
                                  text: card.primarySurface.text,
                                })}
                                title={t('terminology.playAria', {
                                  text: card.primarySurface.text,
                                })}
                              >
                                <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className={`term-rail-card-bookmark${isBookmarked ? ' is-on' : ''}`}
                              aria-pressed={isBookmarked}
                              aria-label={
                                isBookmarked
                                  ? t('terminology.unbookmarkAria', {
                                      text: card.primarySurface.text,
                                    })
                                  : t('terminology.bookmarkAria', {
                                      text: card.primarySurface.text,
                                    })
                              }
                              title={
                                isBookmarked
                                  ? t('terminology.unbookmarkAria', {
                                      text: card.primarySurface.text,
                                    })
                                  : t('terminology.bookmarkAria', {
                                      text: card.primarySurface.text,
                                    })
                              }
                              disabled={bookmarkBusy}
                              onClick={(e) => void handleToggleBookmark(card.termId, e)}
                            >
                              <TermBookmarkIcon marked={isBookmarked} size={16} />
                            </button>
                          </div>
                        </div>

                        {glossPreview ? (
                          <p className="term-rail-card-gloss">{glossPreview}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Unified compact pagination toolbar */}
              {totalPages > 1 ? (
                <div
                  className="term-rail-pagination"
                  role="navigation"
                  aria-label="Vocabulary pagination"
                >
                  <button
                    type="button"
                    className="term-rail-page-btn"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label={t('terminology.prevPage')}
                    title={t('terminology.prevPage')}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>

                  <div className="term-rail-page-pill">
                    <span className="term-rail-page-current">
                      {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, rail.length)}`}
                    </span>
                    <span className="term-rail-page-sep">/</span>
                    <span className="term-rail-page-total">{rail.length}</span>
                  </div>

                  <button
                    type="button"
                    className="term-rail-page-btn"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    aria-label={t('terminology.nextPage')}
                    title={t('terminology.nextPage')}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {error ? (
        <p className="term-rail-error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Mobile Bottom Sheet Modal */}
      {mobileDialogOpen ? (
        <TermCardDialog
          card={resolvedCards[mobileDialogOpen.termId] ?? mobileDialogOpen}
          alreadyInNotebook={Boolean(bookmarkedMap[mobileDialogOpen.termId])}
          bookmarked={Boolean(bookmarkedMap[mobileDialogOpen.termId])}
          onToggleBookmark={() => void handleToggleBookmark(mobileDialogOpen.termId)}
          bookmarkBusy={bookmarkBusy}
          metInLine={metInMap[mobileDialogOpen.termId]}
          onClose={() => setMobileDialogOpen(null)}
          onPlay={
            (mobileDialogOpen.primarySurface.audioAvailable ||
              mobileDialogOpen.aliases.some((a) => a.audioAvailable)) &&
            !audio.playFailed
              ? (surface) => {
                  void audio.play(mobileDialogOpen.termId, surface);
                }
              : undefined
          }
          playingSurface={
            audio.playingTermId === mobileDialogOpen.termId ? audio.playingSurface : null
          }
          playFailed={audio.playFailed && audio.playingTermId === mobileDialogOpen.termId}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </aside>
  );
}
