import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { TermCardDialog } from './TermCardDialog';
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

test('Escape closes the dialog and restores focus', () => {
  const onClose = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <button type="button">Opener</button>
      <TermCardDialog card={card} onClose={onClose} />
    </I18nextProvider>,
  );

  const close = screen.getByRole('button', { name: /close/i });
  expect(close).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
