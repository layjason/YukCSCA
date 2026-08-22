import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { AdminNotifyContext } from '../adminNotify';
import type { SyllabusOutlineItem, TermDraft } from '../types';
import { TermBankEditor } from './TermBankEditor';

const outlineItems: SyllabusOutlineItem[] = [
  {
    id: 'out-1',
    parentId: null,
    order: 0,
    sourcePosition: { page: 1, section: '1.1' },
    summary: { indonesian: 'Aljabar', english: 'Algebra', simplifiedChinese: '代数' },
  },
];

function term(overrides: Partial<TermDraft> = {}): TermDraft {
  return {
    id: 'term-1',
    termClass: 'TOPIC_TERM',
    surfaceForms: [{ text: '', pinyin: '' }],
    definitions: { indonesian: '', english: '', simplifiedChinese: '' },
    englishEquivalent: '',
    outlineItemIds: [],
    ...overrides,
  };
}

function renderEditor(
  terms: TermDraft[],
  onChange = vi.fn(),
  notify = vi.fn(),
  publishedPackageId: string | null = null,
) {
  return {
    onChange,
    notify,
    ...render(
      <I18nextProvider i18n={i18n}>
        <AdminNotifyContext.Provider value={notify}>
          <TermBankEditor
            terms={terms}
            outlineItems={outlineItems}
            onChange={onChange}
            publishedPackageId={publishedPackageId}
          />
        </AdminNotifyContext.Provider>
      </I18nextProvider>,
    ),
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('TermBankEditor', () => {
  test('uses plain-language labels', () => {
    renderEditor([term()]);
    expect(screen.getByText('Chinese term')).toBeInTheDocument();
    expect(screen.getByText('Mapped outline items')).toBeInTheDocument();
  });

  test('auto-fills pinyin from Chinese input', () => {
    const { onChange } = renderEditor([term()]);
    fireEvent.change(screen.getByLabelText('Chinese term'), { target: { value: '导数' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        surfaceForms: [{ text: '导数', pinyin: 'dǎo shù' }],
      }),
    ]);
  });

  test('keeps an admin polyphone correction when Chinese changes', () => {
    const { onChange } = renderEditor([
      term({ surfaceForms: [{ text: '银行', pinyin: 'yín xíng' }] }),
    ]);
    fireEvent.change(screen.getByLabelText('Chinese term'), { target: { value: '银行卡' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        surfaceForms: [{ text: '银行卡', pinyin: 'yín xíng' }],
      }),
    ]);
  });

  test('removes an alias row', () => {
    const { onChange } = renderEditor([
      term({
        surfaceForms: [
          { text: '因式分解', pinyin: 'yīn shì fēn jiě' },
          { text: '分解因式', pinyin: 'fēn jiě yīn shì' },
        ],
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove alias' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        surfaceForms: [{ text: '因式分解', pinyin: 'yīn shì fēn jiě' }],
      }),
    ]);
  });

  test('previews symbols in a LaTeX resource card', () => {
    renderEditor([term({ symbols: 'x^2' })]);
    expect(screen.getByRole('heading', { name: 'Symbols' })).toBeInTheDocument();
    expect(screen.getByText('LaTeX')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbols')).toBeInTheDocument();
    expect(screen.getByLabelText(/mathematical expression: x\^2/i)).toBeInTheDocument();
  });

  test('toasts when published audio is not available for a draft term', () => {
    const { notify } = renderEditor([term({ surfaceForms: [{ text: '求', pinyin: 'qiú' }] })]);
    expect(screen.getByRole('status')).toHaveTextContent('Audio is generated upon publishing.');
    fireEvent.click(screen.getByRole('button', { name: /play published pronunciation/i }));
    expect(notify).toHaveBeenCalledWith('Published audio is not available for this term.', 'info');
    expect(screen.queryByText('Published audio is not available for this term.')).toBeNull();
  });

  test('plays published audio next to each surface as an icon-only control', () => {
    renderEditor(
      [
        term({
          surfaceForms: [
            { text: '因式分解', pinyin: 'yīn shì fēn jiě' },
            { text: '分解因式', pinyin: 'fēn jiě yīn shì' },
          ],
        }),
      ],
      vi.fn(),
      vi.fn(),
      'pkg-1',
    );
    expect(screen.queryByText('Audio is generated upon publishing.')).not.toBeInTheDocument();
    const playButtons = screen.getAllByRole('button', { name: /play published pronunciation/i });
    expect(playButtons).toHaveLength(2);
    playButtons.forEach((button) => {
      expect(button).not.toHaveTextContent('Play');
    });
  });

  test('toasts when an alias is added', () => {
    const { notify, onChange } = renderEditor([term()]);
    fireEvent.click(screen.getByRole('button', { name: /\+ add alias/i }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        surfaceForms: [
          { text: '', pinyin: '' },
          { text: '', pinyin: '' },
        ],
      }),
    ]);
    expect(notify).toHaveBeenCalledWith('Alias added.', 'success');
  });
});
