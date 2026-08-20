import { useTranslation } from 'react-i18next';
import { MixedProse } from '@/shared/content/MixedProse';
import { containsInlineLatex, mixedLatexHasAngleBrackets } from '@/shared/content/inlineLatex';

interface AdminInlineLatexPreviewProps {
  text: string;
}

/** Live student-shaped preview when a TEXT-like field contains `\(...\)`. */
export function AdminInlineLatexPreview({
  text,
}: AdminInlineLatexPreviewProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!containsInlineLatex(text)) return null;
  return (
    <div className="admin-mixed-preview">
      {mixedLatexHasAngleBrackets(text) ? (
        <p className="admin-field-error" role="status">
          {t('admin.academic.blocks.latexAngleBracketWarning')}
        </p>
      ) : null}
      <MixedProse text={text} as="div" className="learn-text-block" />
    </div>
  );
}
