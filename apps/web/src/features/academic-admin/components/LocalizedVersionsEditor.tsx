import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentBlockEditor } from './ContentBlockEditor';
import {
  EXPLANATION_LANGUAGES,
  isVersionFilled,
  upsertLocalizedVersion,
  versionForLanguage,
  type LocalizedContentVersion,
} from '../localizedContentDraft';
import type { ContentBlock, ExplanationLanguage } from '../types';

interface LocalizedVersionsEditorProps {
  versions: LocalizedContentVersion[];
  onChange: (next: LocalizedContentVersion[]) => void;
  contentLabel: string;
  disabled?: boolean;
}

function languageAriaLabel(t: (key: string) => string, language: ExplanationLanguage): string {
  switch (language) {
    case 'id':
      return t('admin.academic.localized.langId');
    case 'zh-CN':
      return t('admin.academic.localized.langZh');
    case 'en':
    default:
      return t('admin.academic.localized.langEn');
  }
}

function languageShort(t: (key: string) => string, language: ExplanationLanguage): string {
  switch (language) {
    case 'id':
      return t('admin.academic.localized.shortId');
    case 'zh-CN':
      return t('admin.academic.localized.shortZh');
    case 'en':
    default:
      return t('admin.academic.localized.shortEn');
  }
}

/**
 * Compact language switcher: ID / EN / ZH.
 * Active = color highlight only. Filled = small status dot. Empty languages omitted on save.
 */
export function LocalizedVersionsEditor({
  versions,
  onChange,
  contentLabel,
  disabled = false,
}: LocalizedVersionsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [activeLanguage, setActiveLanguage] = useState<ExplanationLanguage>(() => {
    const firstFilled = EXPLANATION_LANGUAGES.find((lang) =>
      isVersionFilled(versions.find((v) => v.language === lang)),
    );
    return firstFilled ?? 'en';
  });

  const active = versionForLanguage(versions, activeLanguage);

  const setBlocks = (blocks: ContentBlock[]) => {
    onChange(upsertLocalizedVersion(versions, activeLanguage, blocks));
  };

  return (
    <div className="admin-stack-md">
      <div
        className="admin-localized-tabs"
        role="tablist"
        aria-label={t('admin.academic.localized.tabsAria')}
      >
        {EXPLANATION_LANGUAGES.map((language) => {
          const filled = isVersionFilled(versions.find((v) => v.language === language));
          const isActive = language === activeLanguage;
          return (
            <button
              key={language}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={languageAriaLabel(t, language)}
              className={[
                'admin-lang-tab',
                isActive ? 'admin-lang-tab-active' : '',
                filled ? 'admin-lang-tab-filled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveLanguage(language)}
              disabled={disabled}
            >
              <span className="admin-lang-tab-code">{languageShort(t, language)}</span>
              {filled ? <span className="admin-lang-tab-dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <ContentBlockEditor
        label={contentLabel}
        blocks={active.blocks?.length ? active.blocks : [{ kind: 'TEXT', text: '' }]}
        onChange={setBlocks}
      />
    </div>
  );
}
