import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Play, RotateCcw } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  listAssessmentSessions,
  listAssessmentSets,
  startAssessmentSession,
} from './api/assessmentApi';
import { ExamLanguagePicker } from './components/ExamLanguagePicker';
import { resolveLocalizedText } from './localizedText';
import type {
  AcademicSubject,
  AssessmentSessionResumeSummary,
  AssessmentSetSummary,
  ExamLanguage,
} from './types';
import { ACADEMIC_SUBJECTS, isExamLanguage } from './types';
import './assessment.css';

export function PracticeHubPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const subject: AcademicSubject = ACADEMIC_SUBJECTS[0] ?? 'MATHEMATICS';

  const [sets, setSets] = useState<AssessmentSetSummary[]>([]);
  const [resumes, setResumes] = useState<AssessmentSessionResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examLanguage, setExamLanguage] = useState<ExamLanguage | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [setList, sessionList] = await Promise.all([
        listAssessmentSets(subject, { purpose: 'TOPIC_PRACTICE' }),
        listAssessmentSessions({ status: 'IN_PROGRESS', subject }),
      ]);
      setSets(setList);
      setResumes(sessionList);
      // Default exam language only when a single edition exists — never from interface language.
      const langs = [...new Set(setList.map((s) => s.examLanguage))];
      if (langs.length === 1 && isExamLanguage(langs[0])) {
        setExamLanguage(langs[0]);
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
  }, [subject, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart(set: AssessmentSetSummary): Promise<void> {
    const lang = examLanguage ?? set.examLanguage;
    if (!lang) return;
    setStartingId(set.setId);
    setError(null);
    try {
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

  const availableExamLanguages = [...new Set(sets.map((s) => s.examLanguage))] as ExamLanguage[];

  const filteredSets = examLanguage ? sets.filter((s) => s.examLanguage === examLanguage) : sets;

  return (
    <div className="page-content assessment-page practice-hub">
      <header className="assessment-hero assessment-hero-mint">
        <p className="assessment-eyebrow">{t('assessment.practice.eyebrow')}</p>
        <h1>{t('assessment.practice.title')}</h1>
        <div className="assessment-hero-actions">
          <Link to="/app/practice/mistakes" className="btn-secondary assessment-inline-link">
            <BookOpen size={18} aria-hidden="true" />
            {t('assessment.practice.mistakesLink')}
          </Link>
        </div>
      </header>

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

      {!loading && !error && resumes.length > 0 ? (
        <section className="assessment-section" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="assessment-section-title">
            {t('assessment.practice.continue')}
          </h2>
          <ul className="assessment-card-list">
            {resumes.map((row) => {
              const title =
                resolveLocalizedText(row.title, i18n.language) ||
                t(`assessment.purpose.${row.purpose}`);
              return (
                <li key={row.sessionId}>
                  <Link
                    to={`/app/practice/sessions/${row.sessionId}`}
                    className="assessment-card assessment-card-continue"
                  >
                    <div className="assessment-card-main">
                      <span className="assessment-chip is-soft">
                        {t(`assessment.purpose.${row.purpose}`)}
                      </span>
                      <span className="assessment-card-title">{title}</span>
                      <span className="assessment-card-meta">
                        {t('assessment.practice.progress', {
                          answered: row.answeredItemCount,
                          total: row.questionCount,
                        })}
                      </span>
                    </div>
                    <RotateCcw size={20} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="assessment-section" aria-labelledby="sets-heading">
          <div className="assessment-section-head">
            <h2 id="sets-heading" className="assessment-section-title">
              {t('assessment.practice.topicSets')}
            </h2>
            {availableExamLanguages.length > 1 ? (
              <ExamLanguagePicker
                value={examLanguage}
                available={availableExamLanguages}
                onChange={setExamLanguage}
              />
            ) : null}
          </div>

          {filteredSets.length === 0 ? (
            <div className="empty-state state-notice state-notice-info" role="status">
              <h3>{t('assessment.practice.emptyTitle')}</h3>
              <p>{t('assessment.practice.emptyDescription')}</p>
            </div>
          ) : (
            <ul className="assessment-card-list">
              {filteredSets.map((set) => {
                const title = resolveLocalizedText(set.title, i18n.language);
                const busy = startingId === set.setId;
                return (
                  <li key={`${set.setId}-${set.examLanguage}`}>
                    <article className="assessment-card">
                      <div className="assessment-card-main">
                        <span className="assessment-card-title">{title}</span>
                        <span className="assessment-card-meta">
                          {t('assessment.practice.questionCount', { count: set.questionCount })}
                          {set.estimatedMinutes != null
                            ? ` · ${t('assessment.practice.minutes', { minutes: set.estimatedMinutes })}`
                            : ''}
                          {` · ${t(`assessment.examLanguages.${set.examLanguage === 'zh-CN' ? 'zhCN' : set.examLanguage}`)}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busy || (availableExamLanguages.length > 1 && !examLanguage)}
                        onClick={() => void handleStart(set)}
                        aria-busy={busy}
                      >
                        <Play size={18} aria-hidden="true" />
                        {busy ? t('assessment.starting') : t('assessment.practice.start')}
                      </button>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default PracticeHubPage;
