import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXPreviewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function KaTeXPreview({
  latex,
  displayMode = false,
  className = '',
}: KaTeXPreviewProps): React.JSX.Element {
  const rendered = useMemo(() => {
    try {
      return {
        html: katex.renderToString(latex || '', {
          displayMode,
          throwOnError: false,
          output: 'html',
        }),
        error: null,
      };
    } catch (err) {
      return {
        html: null,
        error: err instanceof Error ? err.message : 'Invalid LaTeX equation',
      };
    }
  }, [latex, displayMode]);

  if (rendered.error) {
    return (
      <div className={`field-error ${className}`} role="alert">
        <span>LaTeX Error: {rendered.error}</span>
      </div>
    );
  }

  if (displayMode) {
    return (
      <div
        className={`katex-box katex-box-display ${className}`}
        aria-label={`Math formula: ${latex}`}
        dangerouslySetInnerHTML={{ __html: rendered.html || '' }}
      />
    );
  }

  return (
    <span
      className={`katex-box ${className}`}
      aria-label={`Math formula: ${latex}`}
      dangerouslySetInnerHTML={{ __html: rendered.html || '' }}
    />
  );
}
