import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import type { PreviewMatchTarget } from './types';
import { TermPracticeDock } from './TermPracticeDock';
import { TermSheet } from './termSheet';
import './term-practice.css';

export const MATCH_PAGE_SIZE = 5;

export type MatchTile = PreviewMatchTarget & { pinyin?: string | null };

const EMPTY_PAGE: MatchTile[] = [];

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = next[i];
    const right = next[j];
    if (left === undefined || right === undefined) continue;
    next[i] = right;
    next[j] = left;
  }
  return next;
}

function rosterKeyOf(items: readonly MatchTile[]): string {
  return items.map((item) => `${item.termId}:${item.matchKey}`).join('|');
}

function chunkPages(items: readonly MatchTile[], size: number): MatchTile[][] {
  const pages: MatchTile[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length > 0 ? pages : [[]];
}

function tileClass(
  token: string,
  selected: string | null,
  correctIds: ReadonlySet<string>,
  wrongIds: ReadonlySet<string>,
  settled: ReadonlySet<string>,
): string {
  const classes = ['term-match-tile'];
  if (correctIds.has(token)) classes.push('is-correct');
  else if (wrongIds.has(token)) classes.push('is-wrong');
  else if (settled.has(token)) classes.push('is-settled');
  else if (selected === token) classes.push('is-selected');
  return classes.join(' ');
}

function leftToken(termId: string): string {
  return `L:${termId}`;
}

function rightToken(matchKey: string): string {
  return `R:${matchKey}`;
}

export function TermMatchBoard({
  targets,
  busy = false,
  onSubmit,
  onContinue,
  onEnd,
  onPlayPrompt,
}: {
  targets: MatchTile[];
  busy?: boolean;
  onSubmit: (pairs: { termId: string; selectedMatchKey: string }[]) => void;
  onContinue?: () => void;
  onEnd: () => void;
  onPlayPrompt?: (termId: string, surface: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const rosterKey = rosterKeyOf(targets);
  const pages = useMemo(
    () => chunkPages(targets, MATCH_PAGE_SIZE),
    // A new array from the parent must not rebuild pages or reshuffle columns.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity is rosterKey
    [rosterKey],
  );
  const roster = useMemo(() => pages.flat(), [pages]);
  const [pageIndex, setPageIndex] = useState(0);
  const safePage = Math.min(pageIndex, pages.length - 1);
  const pageItems = pages[safePage] ?? EMPTY_PAGE;
  const pageKey = pageItems.map((item) => item.termId).join('|');
  const leftColumn = useMemo(() => shuffle(pageItems), [pageItems]);
  const rightColumn = useMemo(() => shuffle(pageItems), [pageItems]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [settledLeft, setSettledLeft] = useState<Set<string>>(() => new Set());
  const [settledRight, setSettledRight] = useState<Set<string>>(() => new Set());
  const [correctFlash, setCorrectFlash] = useState<Set<string>>(() => new Set());
  const [wrongFlash, setWrongFlash] = useState<Set<string>>(() => new Set());
  const [showPinyin, setShowPinyin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    setPageIndex(0);
    setSettledLeft(new Set());
    setSettledRight(new Set());
    submittedRef.current = false;
  }, [rosterKey]);

  useEffect(() => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setCorrectFlash(new Set());
    setWrongFlash(new Set());
  }, [pageKey]);

  useEffect(() => {
    if (!selectedLeft || !selectedRight) return;
    const left = roster.find((target) => target.termId === selectedLeft);
    const locked = selectedLeft;
    const rightKey = selectedRight;
    if (!left) return;
    const ok = left.matchKey === rightKey;
    const tokens = new Set([leftToken(locked), rightToken(rightKey)]);
    if (ok) {
      setCorrectFlash(tokens);
      setSettledLeft((current) => new Set([...current, locked]));
      setSettledRight((current) => new Set([...current, rightKey]));
      const timer = window.setTimeout(() => {
        setCorrectFlash(new Set());
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
      return () => window.clearTimeout(timer);
    }
    setWrongFlash(tokens);
    const timer = window.setTimeout(() => {
      setWrongFlash(new Set());
      setSelectedLeft(null);
      setSelectedRight(null);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [selectedLeft, selectedRight, roster]);

  const matchedCount = settledLeft.size;
  const total = roster.length;
  const pageComplete =
    pageItems.length > 0 && pageItems.every((item) => settledLeft.has(item.termId));
  const locked = correctFlash.size > 0 || wrongFlash.size > 0;
  const hasNextPage = safePage < pages.length - 1;

  function pickLeft(termId: string): void {
    if (busy || locked || settledLeft.has(termId)) return;
    if (selectedLeft === termId) {
      setSelectedLeft(null);
      return;
    }
    const tile = pageItems.find((item) => item.termId === termId);
    if (tile) onPlayPrompt?.(termId, tile.promptSurface);
    setSelectedLeft(termId);
  }

  function pickRight(matchKey: string): void {
    if (busy || locked || settledRight.has(matchKey)) return;
    setSelectedRight((current) => (current === matchKey ? null : matchKey));
  }

  function submitAll(): void {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(
      roster.map((target) => ({
        termId: target.termId,
        selectedMatchKey: target.matchKey,
      })),
    );
  }

  function handleContinue(): void {
    if (busy || !pageComplete) return;
    if (hasNextPage) {
      setPageIndex((current) => current + 1);
      return;
    }
    submitAll();
    onContinue?.();
  }

  return (
    <section className="term-match-board" aria-labelledby="term-pairs-heading">
      <div className="term-match-chrome">
        <button
          type="button"
          className="term-match-settings"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('terminology.pairsSettings')}
        >
          <Settings size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div
          className="term-match-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={matchedCount}
          aria-label={t('terminology.pairsProgress', { complete: matchedCount, total })}
        >
          <span style={{ width: total === 0 ? '0%' : `${(matchedCount / total) * 100}%` }} />
        </div>
      </div>

      <h2 id="term-pairs-heading" className="term-match-title">
        {t('terminology.pairsTitle')}
      </h2>

      <div className="term-match-grid">
        <div className="term-match-column" data-testid="term-match-prompts">
          {leftColumn.map((target) => (
            <button
              key={`l-${target.termId}`}
              type="button"
              className={tileClass(
                leftToken(target.termId),
                selectedLeft ? leftToken(selectedLeft) : null,
                correctFlash,
                wrongFlash,
                new Set([...settledLeft].map(leftToken)),
              )}
              onClick={() => pickLeft(target.termId)}
              disabled={busy || settledLeft.has(target.termId)}
              aria-pressed={selectedLeft === target.termId}
              lang="zh"
            >
              {target.promptSurface}
              {showPinyin && target.pinyin ? (
                <span className="term-match-tile-pinyin">{target.pinyin}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="term-match-column" data-testid="term-match-meanings">
          {rightColumn.map((target) => (
            <button
              key={`r-${target.matchKey}`}
              type="button"
              className={tileClass(
                rightToken(target.matchKey),
                selectedRight ? rightToken(selectedRight) : null,
                correctFlash,
                wrongFlash,
                new Set([...settledRight].map(rightToken)),
              )}
              onClick={() => pickRight(target.matchKey)}
              disabled={busy || settledRight.has(target.matchKey)}
              aria-pressed={selectedRight === target.matchKey}
            >
              {target.matchLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="term-match-footer">
        {pageComplete ? (
          <TermPracticeDock
            tone="correct"
            idleLabel={t('terminology.pairsSubmit')}
            title={t('terminology.pairsNicelyDone')}
            actionLabel={t('terminology.pairsContinue')}
            onAction={handleContinue}
            busy={busy}
          />
        ) : (
          <TermPracticeDock tone="idle" idleLabel={t('terminology.pairsSubmit')} actionDisabled />
        )}
      </div>

      {settingsOpen ? (
        <TermSheet
          titleId="term-match-settings-title"
          title={t('terminology.pairsSettings')}
          onDismiss={() => setSettingsOpen(false)}
        >
          <div className="term-sheet-group">
            <label className="term-sheet-option">
              <span>{t('terminology.pairsShowPinyin')}</span>
              <input
                type="checkbox"
                checked={showPinyin}
                onChange={(event) => setShowPinyin(event.target.checked)}
              />
            </label>
          </div>
          <button type="button" className="btn-primary" onClick={() => setSettingsOpen(false)}>
            {t('terminology.pairsSettingsDone')}
          </button>
          <button
            type="button"
            className="term-match-end"
            onClick={() => {
              setSettingsOpen(false);
              onEnd();
            }}
          >
            {t('terminology.pairsEndSession')}
          </button>
        </TermSheet>
      ) : null}
    </section>
  );
}
