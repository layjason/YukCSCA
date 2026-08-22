import { useTranslation } from 'react-i18next';
import { KatexFormula } from '@/shared/content/KatexFormula';

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
  const { t } = useTranslation();
  const boxClass = displayMode ? 'katex-box katex-box-display' : 'katex-box';
  return (
    <KatexFormula
      latex={latex}
      displayMode={displayMode}
      className={`${boxClass} ${className}`.trim()}
      ariaLabel={t('content.inlineMathAria', { latex })}
      errorLabel={t('content.inlineMathError')}
    />
  );
}
