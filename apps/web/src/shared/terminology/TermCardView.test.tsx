import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test } from 'vitest';
import i18n from '@/shared/i18n';
import { TermCardView } from './TermCardView';
import type { TermCard } from './types';

const card: TermCard = {
  termId: '00000000-0000-4000-8000-0000000000t1',
  subject: 'MATHEMATICS',
  packageId: '00000000-0000-4000-8000-0000000000a1',
  termClass: 'TOPIC_TERM',
  alreadyInNotebook: false,
  primarySurface: { text: '公因式', pinyin: 'gōng yīn shì', audioAvailable: false },
  aliases: [],
  definition: { availability: 'AVAILABLE', language: 'en', text: 'Common factor' },
  englishEquivalent: 'common factor',
  symbols: null,
  example: null,
  outlineItemIds: [],
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('fills the bookmark control in pronunciation blue when saved', () => {
  const { rerender } = render(
    <I18nextProvider i18n={i18n}>
      <TermCardView card={card} bookmarked={false} onToggleBookmark={() => undefined} />
    </I18nextProvider>,
  );

  const off = screen.getByRole('button', { name: /bookmark 公因式/i });
  expect(off).not.toHaveClass('is-on');
  expect(off.querySelector('svg')).not.toHaveClass('is-marked');
  expect(off.querySelector('svg')).toHaveAttribute('fill', 'none');

  rerender(
    <I18nextProvider i18n={i18n}>
      <TermCardView card={card} bookmarked onToggleBookmark={() => undefined} />
    </I18nextProvider>,
  );

  const on = screen.getByRole('button', { name: /remove 公因式 from notebook/i });
  expect(on).toHaveClass('is-on');
  expect(on.querySelector('svg')).toHaveClass('is-marked');
  expect(on.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
});

test('renders characters, pinyin, definition, and English equivalent', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView card={card} />
    </I18nextProvider>,
  );

  expect(screen.getByText('公因式')).toBeInTheDocument();
  expect(screen.getByText('gōng yīn shì')).toBeInTheDocument();
  expect(screen.getByText('Common factor')).toBeInTheDocument();
  expect(screen.queryByText('common factor')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
});

test('shows alias surface with its own play control', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        card={{
          ...card,
          primarySurface: { ...card.primarySurface, audioAvailable: true },
          aliases: [{ text: '导函数', pinyin: 'dǎo hánshù', audioAvailable: true }],
        }}
        onPlay={() => undefined}
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('Also written')).toBeInTheDocument();
  expect(screen.getByText('导函数')).toBeInTheDocument();
  expect(screen.getByText('dǎo hánshù')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /play pronunciation of 导函数/i })).toBeInTheDocument();
});

test('hides Play and keeps pinyin when audio failed', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        card={{
          ...card,
          primarySurface: { ...card.primarySurface, audioAvailable: true },
        }}
        onPlay={() => undefined}
        playFailed
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('gōng yīn shì')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/audio is not available/i);
});

test('renders inline latex in the definition and example', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        card={{
          ...card,
          definition: {
            availability: 'AVAILABLE',
            language: 'en',
            text: 'If \\(x^2\\) is positive.',
          },
          example: '已知 \\(f(x)=x^2\\)',
        }}
      />
    </I18nextProvider>,
  );

  expect(screen.getAllByRole('img', { name: /x\^2/i }).length).toBeGreaterThanOrEqual(2);
});

test('renders symbols as KaTeX', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView card={{ ...card, symbols: 'x^2' }} />
    </I18nextProvider>,
  );

  expect(screen.getByText('Symbols')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /x\^2/i })).toBeInTheDocument();
});

test('renders english, symbols, and example as separate labeled regions', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        card={{
          ...card,
          definition: { availability: 'AVAILABLE', language: 'id', text: 'Faktor persekutuan' },
          englishEquivalent: 'common factor',
          symbols: 'x^2',
          example: '已知 \\(f(x)=x^2\\)',
        }}
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('Faktor persekutuan')).toBeInTheDocument();
  expect(screen.getByText('In English')).toBeInTheDocument();
  expect(screen.getByText('common factor')).toBeInTheDocument();
  expect(screen.getByText('Symbols')).toBeInTheDocument();
  expect(screen.getByText('Example')).toBeInTheDocument();
  expect(screen.getAllByRole('img', { name: /x\^2/i }).length).toBeGreaterThanOrEqual(2);
});

test('entry layout labels example and skips the already-saved banner', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        layout="entry"
        card={{ ...card, example: '已知 \\(f(x)=x^2\\)' }}
        alreadyInNotebook
        metInLine="Met in lesson"
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('Example')).toBeInTheDocument();
  expect(screen.getByText('Met in lesson')).toBeInTheDocument();
  expect(screen.queryByText(/already in your notebook/i)).not.toBeInTheDocument();
});

test('makes a missing explanation-language gloss explicit', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView
        card={{
          ...card,
          definition: { availability: 'LANGUAGE_UNAVAILABLE', requestedLanguage: 'id' },
        }}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('status')).toHaveTextContent(
    /no definition is available in bahasa indonesia/i,
  );
  expect(screen.queryByText('Common factor')).not.toBeInTheDocument();
});
