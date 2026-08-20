import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import { AssessmentBlocks } from './AssessmentBlocks';
import { LanguageHelpPanel } from './LanguageHelpPanel';
import '../assessment.css';
import type { SessionItemView } from '../types';

const item = (available: boolean, disclosed = false, emptySpans = false): SessionItemView => ({
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
          spans: emptySpans
            ? []
            : [
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

function renderHelp(
  view: SessionItemView,
  extra?: Partial<Parameters<typeof LanguageHelpPanel>[0]>,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguageHelpPanel
          item={view}
          subject="MATHEMATICS"
          sessionId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
          explanationLanguage="en"
          busy={false}
          onDisclose={vi.fn()}
          renderStem={({ spans, onActivate, disabled }) => (
            <AssessmentBlocks
              blocks={view.stem}
              termSpans={spans.length > 0 ? spans : undefined}
              onTermActivate={spans.length > 0 ? onActivate : undefined}
              termDisabled={disabled}
            />
          )}
          {...extra}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('hides Language help when the first-paint flag is false', () => {
  const { container } = renderHelp(item(false));
  expect(screen.queryByRole('button', { name: /language help/i })).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});

test('shows a quiet icon before disclose and key phrases after', () => {
  const { rerender, container } = renderHelp(item(true));

  expect(screen.getByRole('button', { name: /language help/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /language help/i })).toHaveAttribute(
    'title',
    'Language help',
  );
  expect(screen.queryByRole('button', { name: '求' })).not.toBeInTheDocument();
  expect(container.querySelector('.term-chip')).toBeNull();
  expect(container.querySelector('[lang="zh"]')).not.toBeNull();
  expect(screen.queryByText(/key phrases/i)).not.toBeInTheDocument();

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
          renderStem={({ spans, onActivate, disabled }) => (
            <AssessmentBlocks
              blocks={item(true, true).stem}
              termSpans={spans.length > 0 ? spans : undefined}
              onTermActivate={spans.length > 0 ? onActivate : undefined}
              termDisabled={disabled}
            />
          )}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(screen.getByText(/key phrases/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '求' }).length).toBeGreaterThanOrEqual(1);
  const phraseText = container.querySelector('.language-help-phrase-text');
  expect(phraseText).not.toBeNull();
  expect(phraseText).toHaveTextContent('求');
  expect(getComputedStyle(phraseText!).textOverflow).not.toBe('ellipsis');
  expect(getComputedStyle(phraseText!).overflow).not.toBe('hidden');
  expect(getComputedStyle(container.querySelector('.language-help-phrase')!).whiteSpace).not.toBe(
    'nowrap',
  );
  expect(container.querySelector('.language-help-phrase-leader')).not.toBeNull();
  expect(container.textContent ?? '').not.toMatch(/·····|……/);
  expect(screen.queryByText(/select a word or short phrase/i)).not.toBeInTheDocument();
});

test('key phrase surfaces stay intact when they wrap', () => {
  const view = item(true, true);
  view.languageHelp = {
    disclosed: true,
    trigger: 'STUDENT_REQUEST',
    spans: [
      {
        termId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        surfaceForm: '正点电荷在真空中产生的场强',
        blockIndex: 0,
        startOffset: 0,
        endOffset: 13,
        alreadyInNotebook: false,
      },
    ],
  };
  const { container } = renderHelp(view);
  expect(screen.getByRole('button', { name: '正点电荷在真空中产生的场强' })).toBeInTheDocument();
  const phraseText = container.querySelector('.language-help-phrase-text');
  expect(phraseText).toHaveTextContent('正点电荷在真空中产生的场强');
  expect(getComputedStyle(phraseText!).textOverflow).not.toBe('ellipsis');
});

test('shows an honest empty state when disclose returns no spans', () => {
  renderHelp(item(true, true, true));
  expect(screen.getByText(/no reviewed terms appear in this question/i)).toBeInTheDocument();
});

test('hides the Language help control after the session can no longer disclose', () => {
  renderHelp(item(true), { canDisclose: false });
  expect(screen.queryByRole('button', { name: /language help/i })).not.toBeInTheDocument();
});

test('wording-hard chip lookup records LANGUAGE_MISTAKE instead of ITEM', async () => {
  const lookup = vi.spyOn(terminologyApi, 'resolveTermLookup').mockResolvedValue({
    outcome: 'MATCHED',
    card: {
      termId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      termClass: 'EXAM_INSTRUCTION',
      primarySurface: { text: '求', pinyin: 'qiú', audioAvailable: false },
      aliases: [],
      definition: { availability: 'AVAILABLE', language: 'en', text: 'find' },
      englishEquivalent: 'find',

      symbols: null,
      example: null,
      outlineItemIds: [],
    },
    alreadyInNotebook: true,
    entry: {
      termId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      subject: 'MATHEMATICS',
      packageId: '11111111-1111-4111-8111-111111111111',
      termClass: 'EXAM_INSTRUCTION',
      primarySurface: { text: '求', pinyin: 'qiú', audioAvailable: false },
      familiarity: 'LEARNING',
      due: true,
      lastReviewAt: null,
      sources: ['LANGUAGE_MISTAKE'],
      metIn: {
        source: 'LANGUAGE_MISTAKE',
        place: 'CHECKPOINT',
        topicTitle: null,
        outlineItemId: null,
        at: '2026-08-18T00:00:00Z',
      },
      pendingReview: null,
    },
  });

  renderHelp(item(true, true), { lookupSource: 'LANGUAGE_MISTAKE' });

  fireEvent.click(screen.getAllByRole('button', { name: '求' })[0]!);
  await waitFor(() => {
    expect(lookup).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'LANGUAGE_MISTAKE',
        termId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    );
  });
});
