import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import { AskHost } from './AskHost';
import * as agentApi from './api/agentApi';
import type {
  AgentCompletedTurn,
  AgentConversation,
  AgentLocator,
  AgentPendingTurn,
} from './types';

vi.mock('./api/agentApi', async () => {
  const actual = await vi.importActual<typeof agentApi>('./api/agentApi');
  return {
    ...actual,
    getAvailability: vi.fn(),
    startConversation: vi.fn(),
    getConversation: vi.fn(),
    askTurn: vi.fn(),
  };
});

const CONTEXT_ID = '33333333-3333-4333-8333-333333333333';
const CONV_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const completed: AgentCompletedTurn = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  status: 'COMPLETED',
  questionText: 'What is a factor?',
  quote: null,
  createdAt: '2026-09-02T00:00:00Z',
  kind: 'REVIEWED_SOURCE',
  body: 'A factor multiplies with another number to make a product.',
  locators: [
    {
      sourceKind: 'LESSON',
      sourceId: CONTEXT_ID,
      label: 'Factorisation',
      blockIndex: 0,
      packageRevisionId: null,
    },
  ],
  steps: [
    {
      kind: 'TOOL',
      label: 'Looked at this lesson block',
      locators: [],
      latencyMs: 120,
    },
  ],
  suggestedFollowUps: ['Why does this work?'],
  latencyMs: 2100,
};

const emptyConversation: AgentConversation = {
  id: CONV_ID,
  contextType: 'LESSON',
  contextId: CONTEXT_ID,
  subject: 'MATHEMATICS',
  packageId: '11111111-1111-4111-8111-111111111111',
  packageRevisionId: '22222222-2222-4222-8222-222222222222',
  sessionId: null,
  itemId: null,
  explanationLanguage: 'id',
  examLanguage: 'en',
  turns: [],
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
};

function stubDesktop(desktop = true): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: desktop && query.includes('960'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function renderHost(props: Partial<ComponentProps<typeof AskHost>> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AskHost
          context={{ contextType: 'LESSON', contextId: CONTEXT_ID }}
          hostTitle="Factorisation"
          {...props}
        >
          <article>
            <p>Lesson body</p>
            <div className="learn-content-block learn-content-block-math" data-block-index="1">
              x^2
            </div>
          </article>
        </AskHost>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  stubDesktop();
  sessionStorage.clear();
  await i18n.changeLanguage('en');
  vi.mocked(agentApi.getAvailability).mockResolvedValue({
    available: true,
    unavailableCode: null,
  });
  vi.mocked(agentApi.startConversation).mockResolvedValue(emptyConversation);
  vi.mocked(agentApi.getConversation).mockResolvedValue(emptyConversation);
  vi.mocked(agentApi.askTurn).mockResolvedValue(completed);
});

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

test('omits compact Ask while availability is loading', () => {
  vi.mocked(agentApi.getAvailability).mockReturnValue(new Promise(() => undefined));
  renderHost();
  expect(screen.queryByRole('button', { name: 'Ask about this page' })).not.toBeInTheDocument();
});

test('shows compact Ask only when available is true', async () => {
  renderHost();
  expect(await screen.findByRole('button', { name: 'Ask about this page' })).toBeInTheDocument();
});

test('omits working Ask chrome when availability is false', async () => {
  vi.mocked(agentApi.getAvailability).mockResolvedValue({
    available: false,
    unavailableCode: 'AGENT_DISABLED',
  });
  renderHost();
  await waitFor(() => expect(agentApi.getAvailability).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Ask about this page' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('opens an empty rail with disclaimer and no report or video CTA', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('Answers can be wrong. Check the sources.')).toBeInTheDocument();
  expect(screen.getByText('Factorisation')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit question' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/video/i)).not.toBeInTheDocument();
  expect(agentApi.startConversation).toHaveBeenCalled();
});

test('validates an empty question before calling askTurn', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  await screen.findByRole('button', { name: 'Submit question' });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(agentApi.askTurn).not.toHaveBeenCalled();
});

test('renders reviewed provenance, locators, follow-ups, and Worked for Ns', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [completed],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('From this lesson')).toHaveClass('sr-only');
  const answer = screen.getByText(completed.body);
  const worked = screen.getByText('Worked for 2s');
  const source = screen.getByRole('button', { name: /lesson: Factorisation/i });
  const followUp = screen.getByRole('button', { name: 'Why does this work?' });
  expect(worked.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(answer.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(source.compareDocumentPosition(followUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(source.querySelector('svg')).not.toBeNull();
  expect(source.closest('.ask-locators')).not.toBeNull();
  expect(screen.queryByText('REVIEWED_SOURCE')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
});

test('shows derived assistance copy and never official', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [{ ...completed, kind: 'DERIVED_EXPLANATION' }],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('AI explanation')).toHaveClass('sr-only');
  expect(screen.queryByText(/official/i)).not.toBeInTheDocument();
});

test('renders display math from an Ask body instead of raw delimiters', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [{ ...completed, body: 'See \\[a^2+b^2=c^2\\] on the line.' }],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('From this lesson')).toHaveClass('sr-only');
  expect(screen.queryByText('\\[a^2+b^2=c^2\\]')).not.toBeInTheDocument();
  expect(document.querySelector('.learn-math-display, .katex-display, .katex')).not.toBeNull();
});

test('renders safe Markdown emphasis and list structure', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [
      {
        ...completed,
        body: '**Key terms**\n\n1. **集合**\n1.1 并集（union）\n1.2 交集（intersection）',
      },
    ],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const headingText = await screen.findByText('Key terms');
  expect(headingText.closest('.ask-answer-heading')).toBeInTheDocument();
  expect(screen.getByText('集合').closest('strong')).toBeInTheDocument();
  expect(screen.getByText('集合').closest('ol')).toBeInTheDocument();
  expect(screen.getByText('并集（union）').closest('li')).toHaveClass('is-nested');
  expect(screen.queryByText('**Key terms**')).not.toBeInTheDocument();
});

test('renders math in locators and suggested follow-ups', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [
      {
        ...completed,
        questionText: 'What if $x \\ne 2$?',
        body: 'Here is the step.',
        locators: [
          {
            sourceKind: 'LESSON',
            sourceId: '11111111-1111-4111-8111-111111111111',
            label: 'Solve \\(x^2 - 4 = 0\\)',
            blockIndex: 0,
            packageRevisionId: null,
          },
        ],
        steps: [
          {
            kind: 'TOOL',
            label: 'Checked $A \\cap B$',
            locators: [],
            latencyMs: 10,
          },
        ],
        suggestedFollowUps: ['What if \\(x \\ne 2\\)?'],
      },
    ],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByRole('button', { name: /What if/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Solve/ })).toBeInTheDocument();
  expect(document.querySelector('.ask-question-bubble .learn-math')).not.toBeNull();
  expect(screen.queryByText('\\(x^2 - 4 = 0\\)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Worked for 2s'));
  expect(document.querySelector('.ask-trace-label .learn-math')).not.toBeNull();
});

test('shows insufficiency without a report control', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [{ ...completed, kind: 'INSUFFICIENT_EVIDENCE', locators: [], suggestedFollowUps: [] }],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(
    await screen.findByText('Not enough reviewed sources to answer that.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
});

test('warns before the first OPEN-item Ask', async () => {
  const onAsked = vi.fn();
  vi.mocked(agentApi.getAvailability).mockResolvedValue({
    available: true,
    unavailableCode: null,
  });
  renderHost({
    context: {
      contextType: 'ITEM',
      contextId: CONTEXT_ID,
      sessionId: '55555555-5555-4555-8555-555555555555',
      itemId: CONTEXT_ID,
    },
    openItem: { alreadyStrong: false, onAsked },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'Need a hint' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(await screen.findByText('This counts as strong help')).toBeInTheDocument();
  expect(agentApi.askTurn).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ask anyway' }));
  await waitFor(() => expect(agentApi.askTurn).toHaveBeenCalled());
  expect(onAsked).toHaveBeenCalled();
});

test('does not fetch availability when enabled is false', async () => {
  renderHost({ enabled: false });
  expect(agentApi.getAvailability).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Ask about this page' })).not.toBeInTheDocument();
});

test('shows Received before Working while a turn is in flight', async () => {
  vi.mocked(agentApi.askTurn).mockReturnValue(new Promise(() => undefined));
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(await screen.findByText('Received')).toBeInTheDocument();
  expect(screen.getByText('What is a factor?').closest('.ask-question-bubble')).toBeInTheDocument();
  expect(composer).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Submit question' })).toBeDisabled();
});

test('renders restored turns oldest-first and follow-ups from the latest turn', async () => {
  const older: AgentCompletedTurn = {
    ...completed,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    questionText: 'Older question',
    suggestedFollowUps: ['Old chip'],
  };
  const newer: AgentCompletedTurn = {
    ...completed,
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    questionText: 'Newer question',
    suggestedFollowUps: ['New chip'],
  };
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [older, newer],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const olderNode = await screen.findByText('Older question');
  const newerNode = screen.getByText('Newer question');
  expect(
    olderNode.compareDocumentPosition(newerNode) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'New chip' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Old chip' })).not.toBeInTheDocument();
});

test('Escape closes the rail and returns focus to compact Ask', async () => {
  renderHost();
  const trigger = await screen.findByRole('button', { name: 'Ask about this page' });
  fireEvent.click(trigger);
  expect(await screen.findByRole('region', { name: 'Ask about this work' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => {
    expect(screen.queryByRole('region', { name: 'Ask about this work' })).not.toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: 'Ask about this page' })).toHaveFocus();
});

test('Escape on the OPEN confirm cancels the confirm and keeps the rail open', async () => {
  renderHost({
    context: {
      contextType: 'ITEM',
      contextId: CONTEXT_ID,
      sessionId: '55555555-5555-4555-8555-555555555555',
      itemId: CONTEXT_ID,
    },
    openItem: { alreadyStrong: false },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'Need a hint' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(await screen.findByText('This counts as strong help')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => {
    expect(screen.queryByText('This counts as strong help')).not.toBeInTheDocument();
  });
  expect(screen.getByRole('region', { name: 'Ask about this work' })).toBeInTheDocument();
  expect(agentApi.askTurn).not.toHaveBeenCalled();
});

test('submits from the composer with Ctrl+Enter', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.keyDown(composer, { key: 'Enter', ctrlKey: true });
  await waitFor(() => expect(agentApi.askTurn).toHaveBeenCalled());
});

test('announces budget errors instead of a timeout in the live region', async () => {
  vi.mocked(agentApi.askTurn).mockRejectedValueOnce(
    new ApiError(429, { code: 'AGENT_BUDGET_EXCEEDED', detail: 'cap' }, 90),
  );
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  const budgetCopy = await screen.findAllByText(
    'Daily Ask limit reached. Try again in 90 seconds.',
  );
  expect(budgetCopy.length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('Ask timed out.')).not.toBeInTheDocument();
  expect(screen.queryByText('Ask timed out. Try again.')).not.toBeInTheDocument();
});

test('distinguishes timeout, unreadable answer, and generic provider 503 copy', async () => {
  vi.mocked(agentApi.askTurn)
    .mockRejectedValueOnce(
      new ApiError(503, {
        code: 'AGENT_PROVIDER_UNAVAILABLE',
        detail: 'The Ask provider timed out.',
      }),
    )
    .mockRejectedValueOnce(
      new ApiError(503, {
        code: 'AGENT_PROVIDER_UNAVAILABLE',
        detail: 'The Ask answer could not be read. Try again.',
      }),
    )
    .mockRejectedValueOnce(
      new ApiError(503, {
        code: 'AGENT_PROVIDER_UNAVAILABLE',
        detail: 'The Ask provider is temporarily unavailable.',
      }),
    );
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect((await screen.findAllByText('Ask timed out. Try again.')).length).toBeGreaterThanOrEqual(
    1,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    (await screen.findAllByText('Ask could not read that answer. Try again.')).length,
  ).toBeGreaterThanOrEqual(1);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    (await screen.findAllByText('Ask is temporarily unavailable. Try again.')).length,
  ).toBeGreaterThanOrEqual(1);
  expect(screen.queryByText('Ask timed out. Try again.')).not.toBeInTheDocument();
});

test('rotates the Idempotency-Key after a provider failure', async () => {
  vi.mocked(agentApi.askTurn)
    .mockRejectedValueOnce(
      new ApiError(503, { code: 'AGENT_PROVIDER_UNAVAILABLE', detail: 'Provider down' }),
    )
    .mockResolvedValueOnce(completed);
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  const retry = await screen.findByRole('button', { name: 'Try again' });
  fireEvent.click(retry);
  await waitFor(() => expect(agentApi.askTurn).toHaveBeenCalledTimes(2));
  const firstKey = vi.mocked(agentApi.askTurn).mock.calls[0]?.[2];
  const secondKey = vi.mocked(agentApi.askTurn).mock.calls[1]?.[2];
  expect(firstKey).toEqual(expect.any(String));
  expect(secondKey).toEqual(expect.any(String));
  expect(secondKey).not.toEqual(firstKey);
});

test('mints a new Idempotency-Key when the student edits and submits after a failure', async () => {
  vi.mocked(agentApi.askTurn)
    .mockRejectedValueOnce(
      new ApiError(503, { code: 'AGENT_PROVIDER_UNAVAILABLE', detail: 'Provider down' }),
    )
    .mockResolvedValueOnce({ ...completed, questionText: 'What is a product?' });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: 'What is a factor?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  fireEvent.change(composer, { target: { value: 'What is a product?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  await waitFor(() => expect(agentApi.askTurn).toHaveBeenCalledTimes(2));
  const firstCall = vi.mocked(agentApi.askTurn).mock.calls[0];
  const secondCall = vi.mocked(agentApi.askTurn).mock.calls[1];
  expect(firstCall?.[1]).toEqual({ questionText: 'What is a factor?' });
  expect(secondCall?.[1]).toEqual({ questionText: 'What is a product?' });
  expect(secondCall?.[2]).toEqual(expect.any(String));
  expect(secondCall?.[2]).not.toEqual(firstCall?.[2]);
});

test('settles a concurrent turn by clearing the matching composer and notifying the host', async () => {
  const onAsked = vi.fn();
  const pending: AgentPendingTurn = {
    id: completed.id,
    status: 'PENDING',
    questionText: completed.questionText,
    quote: null,
    createdAt: completed.createdAt,
  };
  vi.mocked(agentApi.askTurn).mockRejectedValue(
    new ApiError(409, { code: 'CONCURRENT_TURN_PENDING', detail: 'Another Ask is in progress' }),
  );
  vi.mocked(agentApi.getConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [completed],
  });
  renderHost({ openItem: { alreadyStrong: true, onAsked } });
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: pending.questionText } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  expect(await screen.findByText(completed.body)).toBeInTheDocument();
  await waitFor(() => expect(onAsked).toHaveBeenCalled());
  expect(composer).toHaveValue('');
});

test('retries conversation start when the first open fails', async () => {
  vi.mocked(agentApi.startConversation)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(emptyConversation);
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const retry = await screen.findByRole('button', { name: 'Try again' });
  expect(screen.getByPlaceholderText('Ask about this work')).toBeDisabled();
  fireEvent.click(retry);
  await waitFor(() => expect(agentApi.startConversation).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.getByPlaceholderText('Ask about this work')).not.toBeDisabled(),
  );
});

test('keeps polling after a transient conversation read failure', async () => {
  const pending: AgentPendingTurn = {
    id: completed.id,
    status: 'PENDING',
    questionText: completed.questionText,
    quote: null,
    createdAt: completed.createdAt,
  };
  vi.mocked(agentApi.askTurn).mockRejectedValue(
    new ApiError(409, { code: 'CONCURRENT_TURN_PENDING', detail: 'Another Ask is in progress' }),
  );
  vi.mocked(agentApi.getConversation)
    .mockResolvedValueOnce({ ...emptyConversation, turns: [pending] })
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValue({ ...emptyConversation, turns: [completed] });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  fireEvent.change(composer, { target: { value: pending.questionText } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
  await waitFor(() => expect(screen.getByText(completed.body)).toBeInTheDocument(), {
    timeout: 4000,
  });
}, 10_000);

test('renders quote and question as student-side chips without a Quoted label', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [
      {
        ...completed,
        questionText: 'what am i highligthing',
        quote: '-b\\pm\\sqrt{b^{2}-4ac}',
      },
    ],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('what am i highligthing')).toBeInTheDocument();
  expect(document.querySelector('.ask-quote-pill .katex')).not.toBeNull();
  expect(
    screen.getByText('what am i highligthing').closest('.ask-question-bubble'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/^Quoted$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('group', { name: /Quoted: -b/ })).toBeInTheDocument();
});

test('Worked for Ns is collapsed and expands to checked sources without raw tool names', async () => {
  const locator: AgentLocator = {
    sourceKind: 'LESSON',
    sourceId: CONTEXT_ID,
    label: 'Factorisation',
    blockIndex: 0,
    packageRevisionId: null,
  };
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [
      {
        ...completed,
        latencyMs: 5000,
        locators: [locator, locator],
        steps: [
          {
            kind: 'TOOL',
            label: 'Looked at this lesson',
            locators: [locator, locator],
            latencyMs: 120,
          },
        ],
      },
    ],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const summary = await screen.findByText('Worked for 5s');
  const details = summary.closest('details');
  expect(details).not.toBeNull();
  expect(details).not.toHaveAttribute('open');
  const answer = screen.getByText(completed.body);
  expect(answer.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /lesson: Factorisation/i })).toHaveLength(1);
  fireEvent.click(summary);
  expect(details).toHaveAttribute('open');
  expect(within(details as HTMLElement).getByText('Checked 1 sources')).toBeVisible();
  expect(within(details as HTMLElement).getByText('Looked at this lesson')).toBeVisible();
  expect(within(details as HTMLElement).getByText('1 sources')).toBeVisible();
  expect(
    within(details as HTMLElement).getByRole('button', { name: /lesson: Factorisation/i }),
  ).toBeInTheDocument();
  expect(within(details as HTMLElement).getByText(/Block 0/)).toBeInTheDocument();
  expect(screen.queryByText('getLessonContext')).not.toBeInTheDocument();
  expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
});

function selectHostNode(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent(document, new Event('selectionchange'));
}

test('shows Add to chat when a host selection is pending and drops a quote chip', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  await screen.findByRole('region', { name: 'Ask about this work' });
  const math = document.querySelector('.learn-content-block-math');
  expect(math).not.toBeNull();
  selectHostNode(math as Node);
  const add = await screen.findByRole('button', { name: 'Add to chat' });
  expect(add.querySelector('svg')).not.toBeNull();
  fireEvent.click(add);
  expect(screen.queryByRole('button', { name: 'Add to chat' })).not.toBeInTheDocument();
  expect(document.querySelector('.ask-quote-composer .katex')).not.toBeNull();
  expect(screen.getByRole('group', { name: 'Quoted: x^2' })).toBeInTheDocument();
  expect(screen.queryByText(/^Quoted$/i)).not.toBeInTheDocument();
});

test('shows Add to chat on host highlight while Ask is closed and opens the panel', async () => {
  renderHost();
  await screen.findByRole('button', { name: 'Ask about this page' });
  const body = screen.getByText('Lesson body');
  selectHostNode(body);
  const add = await screen.findByRole('button', { name: 'Add to chat' });
  fireEvent.pointerDown(add);
  fireEvent.click(add);
  expect(await screen.findByRole('region', { name: 'Ask about this work' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Quoted: Lesson body' })).toBeInTheDocument();
  expect(agentApi.startConversation).toHaveBeenCalled();
});

test('omits Add to chat on highlight when Ask is unavailable', async () => {
  vi.mocked(agentApi.getAvailability).mockResolvedValue({
    available: false,
    unavailableCode: 'AGENT_DISABLED',
  });
  renderHost();
  await waitFor(() => expect(agentApi.getAvailability).toHaveBeenCalled());
  selectHostNode(screen.getByText('Lesson body'));
  expect(screen.queryByRole('button', { name: 'Add to chat' })).not.toBeInTheDocument();
});

test('counts working seconds and stops the timer on completion', async () => {
  let finish: ((turn: AgentCompletedTurn) => void) | undefined;
  vi.mocked(agentApi.askTurn).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const composer = await screen.findByPlaceholderText('Ask about this work');
  vi.useFakeTimers();
  try {
    fireEvent.change(composer, { target: { value: 'What is a factor?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByText('Working for 1s')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByText('Working for 3s')).toBeInTheDocument();
    await act(async () => {
      finish?.(completed);
    });
    expect(screen.queryByText(/Working for/)).not.toBeInTheDocument();
    expect(screen.getByText('Worked for 2s')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

test('places the desktop panel after the host and keeps icon send accessible', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  const panel = await screen.findByRole('region', { name: 'Ask about this work' });
  expect(
    screen.getByText('Lesson body').compareDocumentPosition(panel) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const send = screen.getByRole('button', { name: 'Submit question' });
  expect(send.closest('.ask-input-bar')).toContainElement(screen.getByRole('textbox'));
  expect(send).toHaveTextContent('');
  expect(send.querySelector('svg')).not.toBeNull();
  expect(send).toBeDisabled();
});

test('places the mobile sheet against the measured navigation height', async () => {
  stubDesktop(false);
  const navigation = document.createElement('nav');
  navigation.className = 'app-bottom-nav';
  vi.spyOn(navigation, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 1000, 500, 64));
  document.body.append(navigation);
  try {
    renderHost();
    fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
    const panel = await screen.findByRole('region', { name: 'Ask about this work' });
    expect(panel).toHaveClass('ask-panel-sheet');
    expect(panel).toHaveStyle({ bottom: '64px' });
  } finally {
    navigation.remove();
  }
});

test.each([
  ['en', 'How can I help you today?'],
  ['id', 'Ada yang bisa saya bantu hari ini?'],
  ['zh-CN', '今天有什么可以帮你？'],
])(
  'shows the empty greeting in interface language %s and removes it on submit',
  async (language, greeting) => {
    await i18n.changeLanguage(language);
    vi.mocked(agentApi.askTurn).mockReturnValue(new Promise(() => undefined));
    renderHost();
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('agent.askAria') }));
    expect(await screen.findByText(greeting)).toBeInTheDocument();
    const composer = await screen.findByRole('textbox');
    await waitFor(() => expect(composer).not.toBeDisabled());
    fireEvent.change(composer, { target: { value: 'Help with this lesson' } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('agent.submit') }));
    expect(screen.queryByText(greeting)).not.toBeInTheDocument();
  },
);

test.each([
  String.raw`A \cap B = \{x \mid x \in A \text{ and } x \in B\}`,
  String.raw`Consider \(A \cap B\) here.`,
])('renders quoted math through the shared renderer: %s', async (quote) => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [{ ...completed, quote }],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  await screen.findByText(completed.body);
  expect(document.querySelector('.ask-quote-pill .katex')).not.toBeNull();
  expect(screen.getByRole('group', { name: `Quoted: ${quote}` })).toBeInTheDocument();
});
