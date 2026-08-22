import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, BookOpenText, RefreshCw, Wrench } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  getMistake,
  listAssessmentSessions,
  startRevalidation,
  updateMistakeAnnotation,
} from './api/assessmentApi';
import { matchingInProgressSession } from './sessionResume';
import { anyAssistanceUsed, mistakeNextAction } from './assessmentPolicy';
import { AssessmentBlocks } from './components/AssessmentBlocks';
import { FeedbackPanel } from './components/FeedbackPanel';
import { OptionRadiogroup } from './components/OptionRadiogroup';
import { resolveLocalizedText } from './localizedText';
import type { ErrorCause, MistakeDetail } from './types';
import { ERROR_CAUSES } from './types';
import { notebookStateFrom } from '@/shared/terminology/notebookReturn';
import './assessment.css';

export function MistakeDetailPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { mistakeId } = useParams<{ mistakeId: string }>();

  const [mistake, setMistake] = useState<MistakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState('');
  const [cause, setCause] = useState<ErrorCause | ''>('');
  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mistakeId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [data, inProgress] = await Promise.all([
        getMistake(mistakeId),
        listAssessmentSessions({ status: 'IN_PROGRESS' }).catch(() => []),
      ]);
      setMistake(data);
      setNote(data.privateNote ?? '');
      setCause(data.errorCause ?? '');
      setInProgressSessionId(
        matchingInProgressSession(inProgress, {
          purpose: 'REVALIDATION',
          mistakeId,
        })?.sessionId ?? null,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(t('assessment.errors.loadMistake'));
      }
    } finally {
      setLoading(false);
    }
  }, [mistakeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveAnnotation(): Promise<void> {
    if (!mistakeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await updateMistakeAnnotation(mistakeId, {
        errorCause: cause === '' ? null : cause,
        privateNote: note.trim() === '' ? null : note.trim(),
      });
      setMistake(data);
    } catch {
      setError(t('assessment.errors.saveAnnotation'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevalidate(): Promise<void> {
    if (!mistakeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await startRevalidation(mistakeId);
      void navigate(`/app/practice/sessions/${session.sessionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REVALIDATION_NOT_ELIGIBLE') {
        setError(t('assessment.mistakes.revalidationIneligible'));
      } else {
        setError(t('assessment.errors.revalidationFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page-content assessment-page" aria-busy="true">
        <div className="assessment-skeleton">
          <div className="assessment-skel-block" />
          <p className="sr-only">{t('assessment.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content assessment-page">
        <section className="empty-state state-notice state-notice-info" role="status">
          <h1>{t('assessment.mistakes.notFoundTitle')}</h1>
          <p>{t('assessment.mistakes.notFoundDescription')}</p>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            {t('assessment.mistakes.backToList')}
          </Link>
        </section>
      </div>
    );
  }

  if (error && !mistake) {
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('assessment.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (!mistake) {
    return (
      <div className="page-content assessment-page">
        <p>{t('assessment.loading')}</p>
      </div>
    );
  }

  const preferredRemediation =
    mistake.remediationCandidates.find((c) => c.preferred && c.kind === 'REMEDIATION') ??
    mistake.remediationCandidates.find((c) => c.kind === 'REMEDIATION') ??
    mistake.remediationCandidates.find((c) => c.kind === 'LESSON');
  const nextAction = mistakeNextAction(
    mistake.status,
    mistake.revalidationEligible,
    inProgressSessionId != null,
  );
  const remediationHref = preferredRemediation
    ? preferredRemediation.kind === 'REMEDIATION'
      ? `/app/learn/${mistake.subject}/remediation/${preferredRemediation.resourceId}?mistakeId=${mistake.mistakeId}`
      : `/app/learn/${mistake.subject}/lessons/${preferredRemediation.resourceId}?mistakeId=${mistake.mistakeId}`
    : null;
  const remediationLabel =
    preferredRemediation != null
      ? resolveLocalizedText(preferredRemediation.title, i18n.language) ||
        t('assessment.mistakes.studyRemediation')
      : t('assessment.mistakes.studyRemediation');

  return (
    <div className="page-content assessment-page mistake-detail">
      <Link to="/app/practice/mistakes" className="back-btn">
        <span className="back-arrow" aria-hidden="true">
          ←
        </span>
        {t('assessment.mistakes.backToList')}
      </Link>
      {mistake.examLanguage === 'zh-CN' ? (
        <Link
          to="/app/learn/terms"
          state={notebookStateFrom(`${location.pathname}${location.search}`)}
          className="learn-back-link"
        >
          <BookOpenText size={18} aria-hidden="true" />
          {t('assessment.languageHelp.openNotebook')}
        </Link>
      ) : null}

      <header className="assessment-hero assessment-hero-sky">
        <span className={`assessment-status status-${mistake.status.toLowerCase()}`}>
          {t(`assessment.mistakes.status.${mistake.status}`)}
        </span>
        <h1>{t('assessment.mistakes.detailTitle')}</h1>
      </header>

      {error ? (
        <div className="assessment-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mistake-detail-layout">
        <section className="assessment-item-card">
          <div className="assessment-stem">
            <AssessmentBlocks blocks={mistake.attemptQuestion.stem} />
          </div>
          <OptionRadiogroup
            options={mistake.attemptQuestion.options}
            name="mistake-attempt"
            value={mistake.latestResponse.selectedOptionKey}
            onChange={() => undefined}
            disabled
            showCorrectness
            correctKey={mistake.latestResponse.correctOptionKey}
            selectedKey={mistake.latestResponse.selectedOptionKey}
          />
          {mistake.latestResponse.feedback ? (
            <FeedbackPanel
              feedback={mistake.latestResponse.feedback}
              subject={mistake.subject}
              interfaceLanguage={i18n.language}
              assistanceUsed={anyAssistanceUsed(mistake.assistanceSummary)}
            />
          ) : null}
        </section>

        <div className="mistake-detail-side">
          <section className="assessment-section">
            <h2 className="assessment-section-title">{t('assessment.mistakes.annotation')}</h2>
            <label className="assessment-field">
              <span className="assessment-field-label">{t('assessment.mistakes.errorCause')}</span>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value as ErrorCause | '')}
                disabled={busy}
              >
                <option value="">{t('assessment.mistakes.causeNone')}</option>
                {ERROR_CAUSES.map((c) => (
                  <option key={c} value={c}>
                    {t(`assessment.mistakes.causes.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="assessment-field">
              <span className="assessment-field-label">{t('assessment.mistakes.privateNote')}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={busy}
                placeholder={t('assessment.mistakes.privateNotePlaceholder')}
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void handleSaveAnnotation()}
            >
              {t('assessment.mistakes.saveAnnotation')}
            </button>
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section-title">{t('assessment.mistakes.nextSteps')}</h2>
            <div className="assessment-result-actions">
              {nextAction === 'already_passed' ? (
                <>
                  <p className="assessment-card-meta" role="status">
                    {t('assessment.mistakes.alreadyPassed')}
                  </p>
                  {remediationHref && preferredRemediation ? (
                    <Link to={remediationHref} className="btn-secondary">
                      {preferredRemediation.kind === 'REMEDIATION' ? (
                        <Wrench size={18} aria-hidden="true" />
                      ) : (
                        <BookOpen size={18} aria-hidden="true" />
                      )}
                      {t('assessment.mistakes.reviewAgain')}
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  {remediationHref && preferredRemediation ? (
                    <Link to={remediationHref} className="btn-primary">
                      {preferredRemediation.kind === 'REMEDIATION' ? (
                        <Wrench size={18} aria-hidden="true" />
                      ) : (
                        <BookOpen size={18} aria-hidden="true" />
                      )}
                      {remediationLabel}
                    </Link>
                  ) : null}
                  {nextAction === 'continue_revalidation' && inProgressSessionId ? (
                    <Link
                      to={`/app/practice/sessions/${inProgressSessionId}`}
                      className="btn-primary"
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                      {t('assessment.mistakes.continueRevalidation')}
                    </Link>
                  ) : nextAction === 'start_revalidation' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => void handleRevalidate()}
                      aria-busy={busy}
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                      {t('assessment.mistakes.revalidate')}
                    </button>
                  ) : (
                    <p className="assessment-card-meta" role="status">
                      {t('assessment.mistakes.revalidationLocked')}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default MistakeDetailPage;
