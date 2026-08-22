import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { MATCH_PAGE_SIZE, TermMatchBoard } from './TermMatchBoard';
import type { MatchTile } from './TermMatchBoard';

const targets: MatchTile[] = [
  {
    termId: 'term-watch',
    matchKey: 'watch',
    promptSurface: '导数',
    matchLabel: 'derivative',
    pinyin: 'dǎoshù',
  },
  {
    termId: 'term-domain',
    matchKey: 'domain',
    promptSurface: '定义域',
    matchLabel: 'domain',
    pinyin: 'dìngyìyù',
  },
];

function renderBoard(
  props: Partial<ComponentProps<typeof TermMatchBoard>> & { targets?: MatchTile[] } = {},
) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const onEnd = props.onEnd ?? vi.fn();
  const view = render(
    <I18nextProvider i18n={i18n}>
      <TermMatchBoard
        targets={props.targets ?? targets}
        onSubmit={onSubmit}
        onEnd={onEnd}
        {...(props.busy === undefined ? {} : { busy: props.busy })}
        {...(props.onContinue === undefined ? {} : { onContinue: props.onContinue })}
        {...(props.onPlayPrompt === undefined ? {} : { onPlayPrompt: props.onPlayPrompt })}
      />
    </I18nextProvider>,
  );
  return { ...view, onSubmit, onEnd };
}

async function matchPair(prompt: string, meaning: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: prompt }));
  fireEvent.click(screen.getByRole('button', { name: meaning }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: prompt })).toHaveClass('is-settled');
  });
}

function promptOrder(): string[] {
  return within(screen.getByTestId('term-match-prompts'))
    .getAllByRole('button')
    .map((button) => button.textContent ?? '');
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('shows tap instruction and keeps check disabled until the page is complete', () => {
  renderBoard();
  expect(screen.getByRole('heading', { name: /tap the matching pairs/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^check$/i })).toBeDisabled();
});

test('wrong pair flashes then returns; correct pair settles and enables continue', async () => {
  const { onSubmit } = renderBoard();

  fireEvent.click(screen.getByRole('button', { name: '导数' }));
  fireEvent.click(screen.getByRole('button', { name: 'domain' }));
  expect(screen.getByRole('button', { name: '导数' })).toHaveClass('is-wrong');

  await waitFor(() => {
    expect(screen.getByRole('button', { name: '导数' })).not.toHaveClass('is-wrong');
  });

  await matchPair('导数', 'derivative');
  await matchPair('定义域', 'domain');

  expect(screen.getByRole('status')).toHaveTextContent(/nicely done/i);
  const continueButton = screen.getByRole('button', { name: /^continue$/i });
  expect(continueButton).toBeEnabled();
  expect(onSubmit).not.toHaveBeenCalled();

  fireEvent.click(continueButton);
  expect(onSubmit).toHaveBeenCalledWith([
    { termId: 'term-watch', selectedMatchKey: 'watch' },
    { termId: 'term-domain', selectedMatchKey: 'domain' },
  ]);
});

test('wrong flash stays on the chosen pair when matchKey equals termId', () => {
  const leftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const rightId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  renderBoard({
    targets: [
      {
        termId: leftId,
        matchKey: leftId,
        promptSurface: '导数',
        matchLabel: 'derivative',
      },
      {
        termId: rightId,
        matchKey: rightId,
        promptSurface: '定义域',
        matchLabel: 'domain',
      },
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: '导数' }));
  fireEvent.click(screen.getByRole('button', { name: 'domain' }));
  expect(screen.getByRole('button', { name: '导数' })).toHaveClass('is-wrong');
  expect(screen.getByRole('button', { name: 'domain' })).toHaveClass('is-wrong');
  expect(screen.getByRole('button', { name: '定义域' })).not.toHaveClass('is-wrong');
  expect(screen.getByRole('button', { name: 'derivative' })).not.toHaveClass('is-wrong');
});

test('progress fills when matchKey equals termId', async () => {
  const sameId = '55555555-5555-4555-8555-555555555555';
  renderBoard({
    targets: [
      {
        termId: sameId,
        matchKey: sameId,
        promptSurface: '公因式',
        matchLabel: 'common factor',
      },
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: '公因式' }));
  fireEvent.click(screen.getByRole('button', { name: 'common factor' }));

  await waitFor(() => {
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();
  });
});

test('offers continue after every pair is matched without reshuffling', async () => {
  const onContinue = vi.fn();
  const onSubmit = vi.fn();
  const { rerender } = render(
    <I18nextProvider i18n={i18n}>
      <TermMatchBoard
        targets={targets}
        onSubmit={onSubmit}
        onContinue={onContinue}
        onEnd={() => undefined}
      />
    </I18nextProvider>,
  );

  const before = promptOrder();
  await matchPair('导数', 'derivative');
  await matchPair('定义域', 'domain');

  rerender(
    <I18nextProvider i18n={i18n}>
      <TermMatchBoard
        targets={targets.map((target) => ({ ...target }))}
        onSubmit={onSubmit}
        onContinue={onContinue}
        onEnd={() => undefined}
      />
    </I18nextProvider>,
  );

  expect(promptOrder()).toEqual(before);
  expect(screen.getByRole('status')).toHaveTextContent(/nicely done/i);
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
  expect(onSubmit).toHaveBeenCalled();
  expect(onContinue).toHaveBeenCalled();
});

test('plays the Chinese surface when a prompt tile is selected', () => {
  const onPlayPrompt = vi.fn();
  renderBoard({ onPlayPrompt });
  fireEvent.click(screen.getByRole('button', { name: '导数' }));
  expect(onPlayPrompt).toHaveBeenCalledWith('term-watch', '导数');
  fireEvent.click(screen.getByRole('button', { name: '导数' }));
  expect(onPlayPrompt).toHaveBeenCalledTimes(1);
});

test('paginates when there are more than five terms', { timeout: 15000 }, async () => {
  const extra: MatchTile[] = Array.from({ length: MATCH_PAGE_SIZE + 1 }, (_, index) => ({
    termId: `term-${index}`,
    matchKey: `key-${index}`,
    promptSurface: `词${index}`,
    matchLabel: `meaning ${index}`,
  }));
  const { onSubmit } = renderBoard({ targets: extra });

  expect(screen.getByRole('button', { name: '词0' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '词5' })).not.toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '6');

  for (let index = 0; index < MATCH_PAGE_SIZE; index += 1) {
    await matchPair(`词${index}`, `meaning ${index}`);
  }

  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '词5' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '词0' })).not.toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');

  await matchPair('词5', 'meaning 5');
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith(
    extra.map((target) => ({ termId: target.termId, selectedMatchKey: target.matchKey })),
  );
});

test('settings can show pinyin and end the session', async () => {
  const onEnd = vi.fn();
  renderBoard({ onEnd });

  fireEvent.click(screen.getByRole('button', { name: /settings/i }));
  fireEvent.click(screen.getByRole('checkbox', { name: /show pinyin/i }));
  expect(screen.getByText('dǎoshù')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /end session/i }));
  expect(onEnd).toHaveBeenCalled();
});
