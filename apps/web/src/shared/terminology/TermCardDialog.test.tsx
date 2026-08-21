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
  expect(close).toHaveClass('term-dialog-close');
  expect(document.querySelector('.dialog-actions')).toBeNull();
  expect(document.body.classList.contains('app-term-overlay-open')).toBe(true);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('renders bookmark and close buttons side-by-side in term-dialog-actions without overlap', () => {
  const onClose = vi.fn();
  const onToggleBookmark = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <TermCardDialog
        card={card}
        onClose={onClose}
        bookmarked={false}
        onToggleBookmark={onToggleBookmark}
      />
    </I18nextProvider>,
  );

  const actions = document.querySelector('.term-dialog-actions');
  expect(actions).not.toBeNull();

  const bookmarkBtn = screen.getByRole('button', { name: /Bookmark/i });
  const closeBtn = screen.getByRole('button', { name: /close/i });

  expect(actions).toContainElement(bookmarkBtn);
  expect(actions).toContainElement(closeBtn);

  fireEvent.click(bookmarkBtn);
  expect(onToggleBookmark).toHaveBeenCalledTimes(1);

  fireEvent.click(closeBtn);
  expect(onClose).toHaveBeenCalledTimes(1);
});
