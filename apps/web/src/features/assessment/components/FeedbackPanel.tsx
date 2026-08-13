import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, BookOpen, Wrench } from 'lucide-react';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';
import { LanguageToggle } from '@/features/learn/components/LanguageToggle';
import {
  availableExplanationLanguages,
  pickLocalizedContent,
  resolveLocalizedText,
  resolveLocalizedTextForExplanation,
} from '../localizedText';
import type {
  AcademicSubject,
  AssessmentSessionPurpose,
  ExplanationLanguage,
  ItemFeedback,
} from '../types';
import { isExplanationLanguage } from '../types';
import { AssessmentBlocks } from './AssessmentBlocks';

interface FeedbackPanelProps {
  feedback: ItemFeedback;
  subject: AcademicSubject;
  interfaceLanguage: string;
  purpose?: AssessmentSessionPurpose;
  assistanceUsed?: boolean;
}

export function FeedbackPanel({
  feedback,
  subject,
  interfaceLanguage,
  purpose,
  assistanceUsed = false,
}: FeedbackPanelProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const chromeLang = interfaceLanguage || i18n.language;
  const available = useMemo(
    () => availableExplanationLanguages(feedback.explanations),
    [feedback.explanations],
  );
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage | null>(null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        const preferred = isExplanationLanguage(profile.defaultExplanationLanguage)
          ? profile.defaultExplanationLanguage
          : 'id';
        setExplanationLanguage(
          available.includes(preferred) ? preferred : (available[0] ?? preferred),
        );
      })
      .catch(() => {
        if (active) setExplanationLanguage(available[0] ?? 'id');
      });
    return () => {
      active = false;
    };
  }, [available]);

  const selectedLanguage = explanationLanguage ?? available[0] ?? 'id';
  const selectedExplanation = pickLocalizedContent(feedback.explanations, selectedLanguage);
  const assistedCorrect = feedback.correct && assistanceUsed;
  const heading = assistedCorrect
    ? t('assessment.feedback.assistedCorrect')
    : feedback.correct
      ? t('assessment.feedback.correct')
      : t('assessment.feedback.incorrect');

  return (
    <section
      className={`assessment-feedback${feedback.correct ? ' is-correct' : ' is-incorrect'}`}
      role="status"
      aria-live="polite"
    >
      <header className="assessment-feedback-header">
        {feedback.correct ? (
          <CheckCircle2 size={22} aria-hidden="true" />
        ) : (
          <XCircle size={22} aria-hidden="true" />
        )}
        <span>{heading}</span>
      </header>
      {assistedCorrect && purpose === 'REVALIDATION' ? (
        <p className="assessment-result-note">{t('assessment.feedback.revalidationAssisted')}</p>
      ) : null}

      {available.length > 1 ? (
        <div className="assessment-feedback-lang">
          <span className="assessment-field-label" id="feedback-explanation-lang">
            {t('assessment.feedback.explanationLanguage')}
          </span>
          <LanguageToggle
            value={selectedLanguage}
            available={available}
            onChange={setExplanationLanguage}
          />
        </div>
      ) : null}

      {selectedExplanation ? (
        <div className="assessment-feedback-block">
          <AssessmentBlocks blocks={selectedExplanation.blocks} />
        </div>
      ) : null}

      {feedback.commonMistakeNotes.length > 0 ? (
        <ul className="assessment-common-notes">
          {feedback.commonMistakeNotes.map((note, idx) => {
            const text = resolveLocalizedTextForExplanation(note, selectedLanguage, chromeLang);
            return text ? <li key={`note-${idx}`}>{text}</li> : null;
          })}
        </ul>
      ) : null}

      {feedback.relatedResources.length > 0 ? (
        <div className="assessment-related">
          {feedback.relatedResources.map((ref) => {
            const title = resolveLocalizedText(ref.title, chromeLang);
            const to =
              ref.kind === 'REMEDIATION'
                ? `/app/learn/${subject}/remediation/${ref.resourceId}`
                : `/app/learn/${subject}/lessons/${ref.resourceId}`;
            const Icon = ref.kind === 'REMEDIATION' ? Wrench : BookOpen;
            return (
              <Link key={ref.resourceId} to={to} className="assessment-related-link">
                <Icon size={16} aria-hidden="true" />
                <span>{title || t(`assessment.related.${ref.kind.toLowerCase()}`)}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
