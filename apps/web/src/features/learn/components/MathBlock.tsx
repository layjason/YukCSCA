import { useTranslation } from 'react-i18next';
import { KatexFormula } from '@/shared/content/KatexFormula';

interface MathBlockProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

/** Safe KaTeX render for student lesson MATH blocks (no admin imports). */
export function MathBlock({
  latex,
  displayMode = false,
  className = '',
}: MathBlockProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <KatexFormula
      latex={latex}
      displayMode={displayMode}
      className={className}
      ariaLabel={t('learn.lesson.mathAria', { latex })}
      errorLabel={t('learn.lesson.mathError')}
    />
  );
}
