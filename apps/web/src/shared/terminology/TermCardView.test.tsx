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
  primarySurface: { text: '公因式', pinyin: 'gōng yīn shì', audioAvailable: false },
  aliases: [],
  definition: { availability: 'AVAILABLE', language: 'en', text: 'Common factor' },
  englishEquivalent: 'common factor',
  domainMeaning: 'A shared polynomial factor.',
  symbols: null,
  example: null,
  outlineItemIds: [],
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('renders characters, pinyin, definition, and domain meaning', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardView card={card} />
    </I18nextProvider>,
  );

  expect(screen.getByText('公因式')).toBeInTheDocument();
  expect(screen.getByText('gōng yīn shì')).toBeInTheDocument();
  expect(screen.getByText('Common factor')).toBeInTheDocument();
  expect(screen.getByText('common factor')).toBeInTheDocument();
  expect(screen.getByText('A shared polynomial factor.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
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
