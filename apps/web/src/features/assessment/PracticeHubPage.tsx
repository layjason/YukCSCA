import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Target,
  X,
} from 'lucide-react';
import { DestPageHero } from '@/shared/components/DestPageHero';
import { personalDestTitle, usePreferredGivenName } from '@/shared/identity/preferredGivenName';
import { ApiError } from '@/shared/api/httpClient';
import {
  cancelSession,
  listAssessmentSessions,
  listAssessmentSets,
  listMistakes,
  listOutlineLabels,
  startAssessmentSession,
} from './api/assessmentApi';
import { ExamLanguagePicker } from './components/ExamLanguagePicker';
import { resolveLocalizedText } from './localizedText';
import { matchingInProgressForSet, startReplacingInProgressSession } from './sessionResume';
import type {
  AcademicSubject,
  AssessmentSessionResumeSummary,
  AssessmentSetSummary,
  ExamLanguage,
  MistakeSummary,
} from './types';
import { ACADEMIC_SUBJECTS, isExamLanguage } from './types';
import './assessment.css';

type QuestionDifficulty = 'FOUNDATION' | 'STANDARD' | 'ADVANCED';

const DIFFICULTIES: QuestionDifficulty[] = ['FOUNDATION', 'STANDARD', 'ADVANCED'];
const LIST_PREVIEW = 4;

export function PracticeHubPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const preferredName = usePreferredGivenName();
  const navigate = useNavigate();
  const subject: AcademicSubject = ACADEMIC_SUBJECTS[0] ?? 'MATHEMATICS';

  const [sets, setSets] = useState<AssessmentSetSummary[]>([]);
  const [resumes, setResumes] = useState<AssessmentSessionResumeSummary[]>([]);
  const [history, setHistory] = useState<AssessmentSessionResumeSummary[]>([]);
  const [mistakes, setMistakes] = useState<MistakeSummary[]>([]);
  const [outlineLabels, setOutlineLabels] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examLanguage, setExamLanguage] = useState<ExamLanguage | null>(null);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | null>(null);
  const [outlineItemId, setOutlineItemId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [expandContinue, setExpandContinue] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandSets, setExpandSets] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [setList, sessionList, historyList, mistakePage, outlineRows] = await Promise.all([
        listAssessmentSets(subject, { purpose: 'TOPIC_PRACTICE' }),
        listAssessmentSessions({ status: 'IN_PROGRESS', subject }),
        listAssessmentSessions({ status: 'SUBMITTED', subject }),
        listMistakes({ subject, limit: 100 }).catch(() => ({ items: [] as MistakeSummary[] })),
        listOutlineLabels(subject).catch(() => []),
      ]);
      setSets(setList);
      setResumes(sessionList);
      setHistory(historyList.slice(0, 20));
      setMistakes(mistakePage.items);
      const labels = new Map<string, string>();
      for (const row of outlineRows) {
        const label = resolveLocalizedText(row.summary, i18n.language);
        if (label) labels.set(row.id, label);
      }
      setOutlineLabels(labels);
      const langs = [...new Set(setList.map((s) => s.examLanguage))];
      if (langs.length === 1 && isExamLanguage(langs[0])) {
        setExamLanguage((prev) => prev ?? langs[0]!);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('assessment.errors.forbidden'));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t('assessment.errors.unauthorized'));
      } else {
        setError(t('assessment.errors.loadPractice'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, t, i18n.language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onDocPointer(event: MouseEvent): void {
      const target = event.target as Node | null;
      if (!target) return;
      if (filterPanelRef.current?.contains(target)) return;
      if (filterButtonRef.current?.contains(target)) return;
      setFiltersOpen(false);
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setFiltersOpen(false);
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  async function handleStart(set: AssessmentSetSummary, forceNew: boolean): Promise<void> {
    const lang = examLanguage ?? set.examLanguage;
    if (!lang) return;
    setStartingId(set.setId);
    setError(null);
    try {
      if (forceNew) {
        let existing = matchingInProgressForSet(resumes, set.setId, set.examLanguage);
        try {
          const live = await listAssessmentSessions({ status: 'IN_PROGRESS', subject });
          setResumes(live);
          existing = matchingInProgressForSet(live, set.setId, set.examLanguage) ?? existing;
        } catch {
          // Keep the locally known row if the refresh fails.
        }
        const replaced = await startReplacingInProgressSession({
          existingSessionId: existing?.sessionId,
          cancel: cancelSession,
          start: () =>
            startAssessmentSession({
              purpose: 'TOPIC_PRACTICE',
              subject,
              setId: set.setId,
              examLanguage: lang,
            }),
        });
        if (!replaced.ok) {
          setError(
            t(
              replaced.reason === 'CANCEL_FAILED'
                ? 'assessment.errors.startNewCancelFailed'
                : 'assessment.errors.startNewResumeConflict',
            ),
          );
          return;
        }
        void navigate(`/app/practice/sessions/${replaced.session.sessionId}`);
        return;
      }
      const session = await startAssessmentSession({
        purpose: 'TOPIC_PRACTICE',
        subject,
        setId: set.setId,
        examLanguage: lang,
      });
      void navigate(`/app/practice/sessions/${session.sessionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('assessment.errors.setUnavailable'));
      } else {
        setError(t('assessment.errors.startFailed'));
      }
    } finally {
      setStartingId(null);
    }
  }

  const availableExamLanguages = useMemo(
    () => [...new Set(sets.map((s) => s.examLanguage))] as ExamLanguage[],
    [sets],
  );

  const availableDifficulties = useMemo(() => {
    const present = new Set(
      sets.map((s) => s.difficulty).filter((d): d is QuestionDifficulty => d != null),
    );
    return DIFFICULTIES.filter((d) => present.has(d));
  }, [sets]);

  const outlineOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const set of sets) {
      for (const id of set.outlineItemIds) ids.add(id);
    }
    return [...ids].map((id) => ({
      id,
      label: outlineLabels.get(id) || id.slice(0, 8),
    }));
  }, [sets, outlineLabels]);

  const filteredSets = sets.filter((s) => {
    if (examLanguage && s.examLanguage !== examLanguage) return false;
    if (difficulty && s.difficulty !== difficulty) return false;
    if (outlineItemId && !s.outlineItemIds.includes(outlineItemId)) return false;
    return true;
  });

  const activeFilterCount =
    (difficulty ? 1 : 0) +
    (outlineItemId ? 1 : 0) +
    (availableExamLanguages.length > 1 && examLanguage ? 1 : 0);

  const hasFilterUi =
    availableExamLanguages.length > 1 ||
    availableDifficulties.length > 0 ||
    outlineOptions.length > 1 ||
    difficulty != null ||
    outlineItemId != null;

  const featuredResume = resumes[0] ?? null;
  const extraResumes = resumes.slice(1);
  const visibleExtraResumes = expandContinue ? extraResumes : extraResumes.slice(0, LIST_PREVIEW);
  const visibleHistory = expandHistory ? history : history.slice(0, LIST_PREVIEW);
  const visibleSets = expandSets ? filteredSets : filteredSets.slice(0, LIST_PREVIEW);

  const readyMistakes = mistakes.filter((row) => row.revalidationEligible);
  const openMistakes = mistakes.filter(
    (row) => row.status === 'OPEN' || row.status === 'REMEDIATION_IN_PROGRESS',
  );

  function difficultyLabel(d: QuestionDifficulty): string {
    if (d === 'FOUNDATION') return t('assessment.practice.difficultyFoundation');
    if (d === 'ADVANCED') return t('assessment.practice.difficultyAdvanced');
    return t('assessment.practice.difficultyStandard');
  }

  function clearFilters(): void {
    setDifficulty(null);
    setOutlineItemId(null);
    if (availableExamLanguages.length > 1) setExamLanguage(null);
  }

  function purposeLabel(purpose: string): string {
    if (purpose === 'CHECKPOINT' || purpose === 'TOPIC_PRACTICE' || purpose === 'REVALIDATION') {
      return t(`assessment.purpose.${purpose}`);
    }
    return purpose;
  }

  function resumeTitle(row: AssessmentSessionResumeSummary): string {
    return resolveLocalizedText(row.title, i18n.language) || purposeLabel(row.purpose);
  }

  return (
    <div className="page-content assessment-page practice-hub">
      <DestPageHero
        tone="sky"
        icon={Target}
        title={personalDestTitle(
          t('assessment.practice.titleYours'),
          t('assessment.practice.titleNamed', { name: preferredName ?? '' }),
          preferredName,
        )}
      />

      {loading ? (
        <div className="assessment-skeleton" aria-busy="true">
          <div className="assessment-skel-block" />
          <div className="assessment-skel-block short" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      ) : null}

      {error ? (
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('assessment.retry')}
          </button>
        </section>
      ) : null}

      {!loading && !error && featuredResume ? (
        <section className="assessment-continue-block" aria-labelledby="continue-heading">
          <p className="assessment-eyebrow">{t('assessment.practice.pickUp')}</p>
          <h2 id="continue-heading">{resumeTitle(featuredResume)}</h2>
          <div className="assessment-continue-meta">
            <span className="assessment-badge is-purpose">
              {purposeLabel(featuredResume.purpose)}
            </span>
            <span className="assessment-badge is-in-progress">
              {t('assessment.practice.stateInProgress')}
            </span>
            <span className="assessment-list-meta">
              {t('assessment.practice.progress', {
                answered: featuredResume.answeredItemCount,
                total: featuredResume.questionCount,
              })}
            </span>
          </div>
          <div
            className="assessment-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={featuredResume.questionCount}
            aria-valuenow={featuredResume.answeredItemCount}
            aria-label={t('assessment.practice.progress', {
              answered: featuredResume.answeredItemCount,
              total: featuredResume.questionCount,
            })}
          >
            <div
              className="assessment-progress-fill"
              style={{
                width: `${
                  featuredResume.questionCount > 0
                    ? Math.round(
                        (featuredResume.answeredItemCount / featuredResume.questionCount) * 100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <Link
            to={`/app/practice/sessions/${featuredResume.sessionId}`}
            className="btn-primary assessment-continue-cta"
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t('assessment.practice.continueAction')}
          </Link>
        </section>
      ) : null}

      {!loading && !error && extraResumes.length > 0 ? (
        <section className="assessment-list-section" aria-labelledby="more-continue-heading">
          <div className="assessment-list-head">
            <h2 id="more-continue-heading" className="assessment-section-title">
              {t('assessment.practice.alsoInProgress')}
            </h2>
            <span className="assessment-list-count">{extraResumes.length}</span>
          </div>
          <ul className="assessment-list">
            {visibleExtraResumes.map((row) => (
              <li key={row.sessionId}>
                <Link
                  to={`/app/practice/sessions/${row.sessionId}`}
                  className="assessment-list-row"
                >
                  <div className="assessment-list-row-main">
                    <div className="assessment-list-badges">
                      <span className="assessment-badge is-purpose">
                        {purposeLabel(row.purpose)}
                      </span>
                    </div>
                    <span className="assessment-list-title">{resumeTitle(row)}</span>
                    <span className="assessment-list-meta">
                      {t('assessment.practice.progress', {
                        answered: row.answeredItemCount,
                        total: row.questionCount,
                      })}
                    </span>
                  </div>
                  <span className="assessment-list-chevron" aria-hidden="true">
                    <RotateCcw size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {extraResumes.length > LIST_PREVIEW ? (
            <button
              type="button"
              className="assessment-list-more"
              onClick={() => setExpandContinue((v) => !v)}
              aria-expanded={expandContinue}
            >
              {expandContinue
                ? t('assessment.practice.showLess')
                : t('assessment.practice.showMore', { count: extraResumes.length - LIST_PREVIEW })}
              <ChevronDown
                size={16}
                className={expandContinue ? 'is-expanded' : undefined}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </section>
      ) : null}

      {!loading && !error ? (
        <section
          className={`assessment-mistakes-entry${readyMistakes.length > 0 ? ' is-ready' : ''}`}
          aria-labelledby="mistakes-entry-heading"
        >
          <div className="assessment-mistakes-entry-text">
            <h2 id="mistakes-entry-heading">{t('assessment.practice.mistakesTitle')}</h2>
            <p>
              {readyMistakes.length > 0
                ? t('assessment.practice.mistakesReady', { count: readyMistakes.length })
                : openMistakes.length > 0
                  ? t('assessment.practice.mistakesOpen', { count: openMistakes.length })
                  : t('assessment.practice.mistakesHint')}
            </p>
          </div>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            <BookOpen size={18} aria-hidden="true" />
            {t('assessment.practice.mistakesLink')}
          </Link>
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="assessment-list-section" aria-labelledby="sets-heading">
          <div className="assessment-list-head">
            <div className="assessment-list-head-main">
              <h2 id="sets-heading" className="assessment-section-title">
                {t('assessment.practice.topicSets')}
              </h2>
              <span className="assessment-list-count">{filteredSets.length}</span>
            </div>

            {hasFilterUi ? (
              <div className="assessment-filter-popover-wrap">
                <button
                  ref={filterButtonRef}
                  type="button"
                  className={`assessment-filter-trigger${filtersOpen ? ' is-open' : ''}${activeFilterCount > 0 ? ' is-active' : ''}`}
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  aria-controls="practice-filter-panel"
                  aria-label={t('assessment.practice.filters')}
                >
                  <SlidersHorizontal size={18} aria-hidden="true" />
                  {activeFilterCount > 0 ? (
                    <span className="assessment-filter-badge">{activeFilterCount}</span>
                  ) : null}
                </button>

                {filtersOpen ? (
                  <div
                    ref={filterPanelRef}
                    id="practice-filter-panel"
                    className="assessment-filter-popover"
                    role="dialog"
                    aria-label={t('assessment.practice.filters')}
                  >
                    <div className="assessment-filter-popover-head">
                      <strong>{t('assessment.practice.filters')}</strong>
                      <button
                        type="button"
                        className="assessment-filter-close"
                        onClick={() => setFiltersOpen(false)}
                        aria-label={t('assessment.practice.closeFilters')}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>

                    {availableExamLanguages.length > 1 ? (
                      <div className="assessment-filter-popover-field">
                        <ExamLanguagePicker
                          value={examLanguage}
                          available={availableExamLanguages}
                          onChange={setExamLanguage}
                        />
                      </div>
                    ) : null}

                    {availableDifficulties.length > 0 || difficulty ? (
                      <label className="assessment-filter-popover-field">
                        <span className="assessment-filter-label">
                          {t('assessment.practice.difficulty')}
                        </span>
                        <select
                          className="text-input"
                          value={difficulty ?? ''}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDifficulty(
                              next === 'FOUNDATION' || next === 'STANDARD' || next === 'ADVANCED'
                                ? next
                                : null,
                            );
                          }}
                        >
                          <option value="">{t('assessment.practice.difficultyAll')}</option>
                          {(availableDifficulties.length > 0
                            ? availableDifficulties
                            : DIFFICULTIES
                          ).map((d) => (
                            <option key={d} value={d}>
                              {difficultyLabel(d)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {outlineOptions.length > 1 || outlineItemId ? (
                      <label className="assessment-filter-popover-field">
                        <span className="assessment-filter-label">
                          {t('assessment.practice.topic')}
                        </span>
                        <select
                          className="text-input"
                          value={outlineItemId ?? ''}
                          onChange={(e) => setOutlineItemId(e.target.value || null)}
                        >
                          <option value="">{t('assessment.practice.topicAll')}</option>
                          {outlineOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        className="btn-secondary assessment-filter-clear"
                        onClick={clearFilters}
                      >
                        {t('assessment.practice.clearFilters')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {filteredSets.length === 0 ? (
            <div className="empty-state state-notice state-notice-info" role="status">
              <h3>{t('assessment.practice.emptyTitle')}</h3>
              <p>{t('assessment.practice.emptyDescription')}</p>
            </div>
          ) : (
            <>
              <ul className="assessment-list">
                {visibleSets.map((set) => {
                  const title = resolveLocalizedText(set.title, i18n.language);
                  const busy = startingId === set.setId;
                  const existing = matchingInProgressForSet(resumes, set.setId, set.examLanguage);
                  return (
                    <li key={`${set.setId}-${set.examLanguage}`}>
                      <div className="assessment-list-row assessment-list-row-set">
                        <div className="assessment-list-row-main">
                          <div className="assessment-list-badges">
                            {existing ? (
                              <span className="assessment-badge is-in-progress">
                                {t('assessment.practice.stateInProgress')}
                              </span>
                            ) : (
                              <span className="assessment-badge is-ready">
                                {t('assessment.practice.stateReady')}
                              </span>
                            )}
                            {set.difficulty ? (
                              <span className="assessment-badge is-soft">
                                {difficultyLabel(set.difficulty)}
                              </span>
                            ) : null}
                          </div>
                          <span className="assessment-list-title">{title}</span>
                          <span className="assessment-list-meta">
                            {t('assessment.practice.questionCount', { count: set.questionCount })}
                            {set.estimatedMinutes != null
                              ? ` · ${t('assessment.practice.minutes', { minutes: set.estimatedMinutes })}`
                              : ''}
                            {` · ${t(`assessment.examLanguages.${set.examLanguage === 'zh-CN' ? 'zhCN' : set.examLanguage}`)}`}
                          </span>
                        </div>
                        {existing ? (
                          <div className="assessment-list-actions">
                            <Link
                              to={`/app/practice/sessions/${existing.sessionId}`}
                              className="btn-primary assessment-list-start"
                            >
                              <RotateCcw size={16} aria-hidden="true" />
                              {t('assessment.practice.continue')}
                            </Link>
                            <button
                              type="button"
                              className="btn-secondary assessment-list-start"
                              disabled={busy}
                              onClick={() => void handleStart(set, true)}
                              aria-busy={busy}
                            >
                              {busy ? t('assessment.starting') : t('assessment.practice.startNew')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary assessment-list-start"
                            disabled={busy}
                            onClick={() => void handleStart(set, false)}
                            aria-busy={busy}
                          >
                            <Play size={16} aria-hidden="true" />
                            {busy ? t('assessment.starting') : t('assessment.practice.start')}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {filteredSets.length > LIST_PREVIEW ? (
                <button
                  type="button"
                  className="assessment-list-more"
                  onClick={() => setExpandSets((v) => !v)}
                  aria-expanded={expandSets}
                >
                  {expandSets
                    ? t('assessment.practice.showLess')
                    : t('assessment.practice.showMore', {
                        count: filteredSets.length - LIST_PREVIEW,
                      })}
                  <ChevronDown
                    size={16}
                    className={expandSets ? 'is-expanded' : undefined}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {!loading && !error && history.length > 0 ? (
        <section className="assessment-list-section is-quiet" aria-labelledby="history-heading">
          <div className="assessment-list-head">
            <h2 id="history-heading" className="assessment-section-title">
              {t('assessment.practice.history')}
            </h2>
            <span className="assessment-list-count">{history.length}</span>
          </div>
          <ul className="assessment-list">
            {visibleHistory.map((row) => {
              const when = new Date(row.updatedAt).toLocaleString(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              return (
                <li key={row.sessionId}>
                  <Link
                    to={`/app/practice/sessions/${row.sessionId}/result`}
                    className="assessment-list-row"
                  >
                    <div className="assessment-list-row-main">
                      <div className="assessment-list-badges">
                        <span className="assessment-badge is-purpose">
                          {purposeLabel(row.purpose)}
                        </span>
                        <span className="assessment-badge is-done">
                          {t('assessment.practice.stateDone')}
                        </span>
                      </div>
                      <span className="assessment-list-title">{resumeTitle(row)}</span>
                      <span className="assessment-list-meta">
                        {t('assessment.practice.historyMeta', {
                          count: row.questionCount,
                          when,
                        })}
                      </span>
                    </div>
                    <span className="assessment-list-chevron" aria-hidden="true">
                      <ChevronRight size={18} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {history.length > LIST_PREVIEW ? (
            <button
              type="button"
              className="assessment-list-more"
              onClick={() => setExpandHistory((v) => !v)}
              aria-expanded={expandHistory}
            >
              {expandHistory
                ? t('assessment.practice.showLess')
                : t('assessment.practice.showMore', { count: history.length - LIST_PREVIEW })}
              <ChevronDown
                size={16}
                className={expandHistory ? 'is-expanded' : undefined}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default PracticeHubPage;
