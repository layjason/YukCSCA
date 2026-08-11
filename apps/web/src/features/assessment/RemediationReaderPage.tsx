import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import { Toast, type ToastTone } from '@/shared/components/Toast';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { ContentBlockView } from '@/features/learn/components/ContentBlockView';
import { LanguageToggle } from '@/features/learn/components/LanguageToggle';
import {
  getPublishedRemediation,
  startRevalidation,
  upsertRemediationProgress,
} from './api/assessmentApi';
import { resolveLocalizedTextForExplanation } from './localizedText';
import type { ContentProgress, ExplanationLanguage, PublishedRemediationDetail } from './types';
import { isAcademicSubject, isExplanationLanguage } from './types';
import './assessment.css';
import '@/features/learn/learn.css';

export function RemediationReaderPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { subject: subjectParam, resourceId } = useParams<{
    subject: string;
    resourceId: string;
  }>();
  const [searchParams] = useSearchParams();
  const mistakeId = searchParams.get('mistakeId');
  const subject = isAcademicSubject(subjectParam) ? subjectParam : null;

  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [resource, setResource] = useState<PublishedRemediationDetail | null>(null);
  const [progress, setProgress] = useState<ContentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        const lang = isExplanationLanguage(profile.defaultExplanationLanguage)
          ? profile.defaultExplanationLanguage
          : 'id';
        setExplanationLanguage(lang);
      })
      .catch(() => {
        if (active) setExplanationLanguage('id');
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!subject || !resourceId || !explanationLanguage) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getPublishedRemediation(subject, resourceId, explanationLanguage);
      setResource(data);
      setProgress(data.contentProgress);
      if (data.contentProgress.status === 'NOT_STARTED') {
        const next = await upsertRemediationProgress(subject, resourceId, {
          status: 'IN_PROGRESS',
          resumeBlockIndex: 0,
          expectedPackageRevisionId: data.packageRevisionId,
        });
        setProgress(next);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(t('assessment.errors.loadRemediation'));
      }
    } finally {
      setLoading(false);
    }
  }, [subject, resourceId, explanationLanguage, t]);

  useEffect(() => {
    if (profileReady && explanationLanguage) void load();
  }, [profileReady, explanationLanguage, load]);

  async function handleComplete(): Promise<void> {
    if (!subject || !resourceId || !resource || saving) return;
    setSaving(true);
    try {
      const next = await upsertRemediationProgress(subject, resourceId, {
        status: 'CONTENT_COMPLETE',
        resumeBlockIndex: 0,
        expectedPackageRevisionId: resource.packageRevisionId,
      });
      setProgress(next);
      setToast({ message: t('assessment.remediation.completeAck'), tone: 'success' });
    } catch {
      setToast({ message: t('assessment.errors.saveProgress'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevalidate(): Promise<void> {
    if (!mistakeId || busy) return;
    setBusy(true);
    try {
      const session = await startRevalidation(mistakeId);
      window.location.assign(`/app/practice/sessions/${session.sessionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REVALIDATION_NOT_ELIGIBLE') {
        setToast({ message: t('assessment.mistakes.revalidationIneligible'), tone: 'error' });
      } else {
        setToast({ message: t('assessment.errors.revalidationFailed'), tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!subject || !resourceId) {
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{t('assessment.errors.invalidLesson')}</p>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            {t('assessment.mistakes.backToList')}
          </Link>
        </section>
      </div>
    );
  }

  if (!profileReady || loading) {
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
          <h1>{t('assessment.remediation.notFoundTitle')}</h1>
          <p>{t('assessment.remediation.notFoundDescription')}</p>
          <Link to="/app/practice/mistakes" className="btn-secondary">
            {t('assessment.mistakes.backToList')}
          </Link>
        </section>
      </div>
    );
  }

  if (error || !resource || !explanationLanguage) {
    return (
      <div className="page-content assessment-page">
        <section className="state-notice state-notice-error" role="alert">
          <p>{error ?? t('assessment.errors.loadRemediation')}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            {t('assessment.retry')}
          </button>
        </section>
      </div>
    );
  }

  const title = resolveLocalizedTextForExplanation(
    resource.title,
    explanationLanguage,
    i18n.language,
  );
  const body = resource.body;
  const isAvailable = body.availability === 'AVAILABLE';
  const blocks = isAvailable ? body.blocks : [];
  const isComplete = progress?.status === 'CONTENT_COMPLETE';

  return (
    <div className="page-content assessment-page remediation-reader learn-page">
      <Link
        to={mistakeId ? `/app/practice/mistakes/${mistakeId}` : '/app/practice/mistakes'}
        className="learn-back-link"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        {mistakeId ? t('assessment.mistakes.detailTitle') : t('assessment.mistakes.backToList')}
      </Link>

      <header className="assessment-hero assessment-hero-cream">
        <p className="assessment-eyebrow">{t('assessment.remediation.eyebrow')}</p>
        <h1>{title || t('assessment.remediation.title')}</h1>
        <LanguageToggle
          value={explanationLanguage}
          available={
            resource.availableExplanationLanguages.length > 0
              ? resource.availableExplanationLanguages
              : [explanationLanguage]
          }
          onChange={setExplanationLanguage}
          disabled={loading}
        />
      </header>

      {isAvailable ? (
        <article className="learn-reader-body is-visible" aria-label={title}>
          {blocks.map((block, index) => (
            <ContentBlockView key={`${resource.resourceId}-${index}`} block={block} index={index} />
          ))}
        </article>
      ) : (
        <section className="state-notice state-notice-info" role="status">
          <p>{t('learn.lesson.languageUnavailableTitle')}</p>
        </section>
      )}

      {isAvailable ? (
        <footer className="learn-reader-actions assessment-result-actions">
          {isComplete ? (
            <>
              <p className="learn-complete-ack" role="status">
                <Check size={18} aria-hidden="true" />
                {t('assessment.remediation.completeAck')}
              </p>
              {mistakeId ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => void handleRevalidate()}
                >
                  <RefreshCw size={18} aria-hidden="true" />
                  {t('assessment.mistakes.revalidate')}
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void handleComplete()}
              aria-busy={saving}
            >
              {saving ? t('learn.lesson.savingProgress') : t('assessment.remediation.markComplete')}
            </button>
          )}
        </footer>
      ) : null}

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

export default RemediationReaderPage;
