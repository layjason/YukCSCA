import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, BookOpen, Wrench } from 'lucide-react';
import { resolveLocalizedText } from '../localizedText';
import type { AcademicSubject, ItemFeedback } from '../types';
import { AssessmentBlocks } from './AssessmentBlocks';

interface FeedbackPanelProps {
  feedback: ItemFeedback;
  subject: AcademicSubject;
  interfaceLanguage: string;
}

export function FeedbackPanel({
  feedback,
  subject,
  interfaceLanguage,
}: FeedbackPanelProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = interfaceLanguage || i18n.language;

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
        <span>
          {feedback.correct ? t('assessment.feedback.correct') : t('assessment.feedback.incorrect')}
        </span>
      </header>

      {feedback.explanations.map((exp, idx) => (
        <div key={`exp-${idx}`} className="assessment-feedback-block">
          <AssessmentBlocks blocks={exp.blocks} />
        </div>
      ))}

      {feedback.commonMistakeNotes.length > 0 ? (
        <ul className="assessment-common-notes">
          {feedback.commonMistakeNotes.map((note, idx) => (
            <li key={`note-${idx}`}>{resolveLocalizedText(note, lang)}</li>
          ))}
        </ul>
      ) : null}

      {feedback.relatedResources.length > 0 ? (
        <div className="assessment-related">
          {feedback.relatedResources.map((ref) => {
            const title = resolveLocalizedText(ref.title, lang);
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
