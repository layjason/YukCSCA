import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '@/shared/styles/content-blocks.css';
import { isSafeLatex } from './inlineLatex';

interface KatexFormulaProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  ariaLabel: string;
  errorLabel: string;
}

/** Bounded KaTeX render for shared surfaces. Raw HTML and extra macros are not enabled. */
export function KatexFormula({
  latex,
  displayMode = false,
  className = '',
  ariaLabel,
  errorLabel,
}: KatexFormulaProps): React.JSX.Element {
  const rendered = useMemo(() => {
    if (!isSafeLatex(latex)) {
      return { html: null as string | null, error: errorLabel };
    }
    try {
      return {
        html: katex.renderToString(latex, {
          displayMode,
          throwOnError: true,
          output: 'html',
          trust: false,
          maxSize: 10,
          maxExpand: 200,
          strict: 'ignore',
        }),
        error: null as string | null,
      };
    } catch {
      return {
        html: null as string | null,
        error: errorLabel,
      };
    }
  }, [latex, displayMode, errorLabel]);

  if (rendered.error || !rendered.html) {
    return (
      <span className={`learn-math-error ${className}`.trim()} role="alert">
        {errorLabel}
      </span>
    );
  }

  if (displayMode) {
    return (
      <div
        className={`learn-math learn-math-display ${className}`.trim()}
        role="img"
        aria-label={ariaLabel}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    );
  }

  return (
    <span
      className={`learn-math ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}
