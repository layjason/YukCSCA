import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useTranslation } from 'react-i18next';

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

  const rendered = useMemo(() => {
    try {
      return {
        html: katex.renderToString(latex || '', {
          displayMode,
          throwOnError: false,
          output: 'html',
          strict: 'ignore',
        }),
        error: null as string | null,
      };
    } catch (err) {
      return {
        html: null as string | null,
        error: err instanceof Error ? err.message : t('learn.lesson.mathError'),
      };
    }
  }, [latex, displayMode, t]);

  if (rendered.error || !rendered.html) {
    return (
      <div className={`learn-math-error ${className}`} role="alert">
        {t('learn.lesson.mathError')}
      </div>
    );
  }

  if (displayMode) {
    return (
      <div
        className={`learn-math learn-math-display ${className}`}
        role="img"
        aria-label={t('learn.lesson.mathAria', { latex })}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    );
  }

  return (
    <span
      className={`learn-math ${className}`}
      role="img"
      aria-label={t('learn.lesson.mathAria', { latex })}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}
