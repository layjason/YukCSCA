import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { LanguageHelpPanel } from './LanguageHelpPanel';
import type { SessionItemView } from '../types';

const item = (available: boolean, disclosed = false): SessionItemView => ({
  itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  order: 0,
  questionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  status: 'OPEN',
  stem: [{ kind: 'TEXT', text: '求公因式' }],
  options: [],
  hintTierCount: 0,
  disclosedTierCount: 0,
  hintLadder: [],
  disclosedHints: [],
  strongAssistance: false,
  selectedOptionKey: null,
  correct: null,
  feedback: null,
  outlineItemIds: [],
  objectiveIds: [],
  languageHelpAvailable: available,
  ...(disclosed
    ? {
        languageHelp: {
          disclosed: true as const,
          trigger: 'STUDENT_REQUEST' as const,
          spans: [
            {
              termId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              surfaceForm: '求',
              blockIndex: 0,
              startOffset: 0,
              endOffset: 1,
              alreadyInNotebook: false,
            },
          ],
        },
      }
    : {}),
});

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('hides Language help when the first-paint flag is false', () => {
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguageHelpPanel
          item={item(false)}
          subject="MATHEMATICS"
          sessionId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
          explanationLanguage="en"
          busy={false}
          onDisclose={vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(screen.queryByRole('button', { name: /language help/i })).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});

test('shows a quiet control before disclose and chips after', () => {
  const { rerender } = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguageHelpPanel
          item={item(true)}
          subject="MATHEMATICS"
          sessionId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
          explanationLanguage="en"
          busy={false}
          onDisclose={vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(screen.getByRole('button', { name: /language help/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '求' })).not.toBeInTheDocument();

  rerender(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguageHelpPanel
          item={item(true, true)}
          subject="MATHEMATICS"
          sessionId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
          explanationLanguage="en"
          busy={false}
          onDisclose={vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(screen.getByRole('button', { name: '求' })).toBeInTheDocument();
});
