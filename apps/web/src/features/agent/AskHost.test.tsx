import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function stubDesktop(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('960'),
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
  expect(await screen.findByText('From this lesson')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Factorisation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Why does this work?' })).toBeInTheDocument();
  expect(screen.getByText('Worked for 2s')).toBeInTheDocument();
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
  expect(await screen.findByText('Assistance — not from reviewed text')).toBeInTheDocument();
  expect(screen.queryByText(/official/i)).not.toBeInTheDocument();
});

test('renders display math from an Ask body instead of raw delimiters', async () => {
  vi.mocked(agentApi.startConversation).mockResolvedValue({
    ...emptyConversation,
    turns: [{ ...completed, body: 'See \\[a^2+b^2=c^2\\] on the line.' }],
  });
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  expect(await screen.findByText('From this lesson')).toBeInTheDocument();
  expect(screen.queryByText('\\[a^2+b^2=c^2\\]')).not.toBeInTheDocument();
  expect(document.querySelector('.learn-math-display, .katex-display, .katex')).not.toBeNull();
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
  expect(screen.getByText('What is a factor?').className).toContain('ask-question-bubble');
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
  expect(screen.getByText('-b\\pm\\sqrt{b^{2}-4ac}')).toBeInTheDocument();
  expect(screen.getByText('what am i highligthing').className).toContain('ask-question-bubble');
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
  expect(screen.getAllByRole('button', { name: 'Factorisation' })).toHaveLength(1);
  fireEvent.click(summary);
  expect(details).toHaveAttribute('open');
  expect(within(details as HTMLElement).getByText('Checked 1 sources')).toBeVisible();
  expect(within(details as HTMLElement).getByText('Looked at this lesson')).toBeVisible();
  expect(within(details as HTMLElement).getByText('1 sources')).toBeVisible();
  expect(
    within(details as HTMLElement).getByRole('button', { name: 'Factorisation' }),
  ).toBeInTheDocument();
  expect(within(details as HTMLElement).getByText(/Block 0/)).toBeInTheDocument();
  expect(screen.queryByText('getLessonContext')).not.toBeInTheDocument();
  expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
});

test('shows Add to chat when a host selection is pending and drops a quote chip', async () => {
  renderHost();
  fireEvent.click(await screen.findByRole('button', { name: 'Ask about this page' }));
  await screen.findByRole('region', { name: 'Ask about this work' });
  const math = document.querySelector('.learn-content-block-math');
  expect(math).not.toBeNull();
  const range = document.createRange();
  range.selectNodeContents(math as Node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent(document, new Event('selectionchange'));
  const add = await screen.findByRole('button', { name: 'Add to chat' });
  expect(add.querySelector('svg')).not.toBeNull();
  fireEvent.click(add);
  expect(screen.queryByRole('button', { name: 'Add to chat' })).not.toBeInTheDocument();
  expect(document.querySelector('.ask-quote-composer')).toHaveTextContent('x^2');
  expect(screen.queryByText(/^Quoted$/i)).not.toBeInTheDocument();
});
