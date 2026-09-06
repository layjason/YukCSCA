/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ApiError } from '@/shared/api/httpClient';
import * as api from './api/assessmentApi';
import MistakesPage from './MistakesPage';
import type { MistakeSummary } from './types';

function row(overrides: Partial<MistakeSummary> = {}): MistakeSummary {
  return {
    mistakeId: '11111111-1111-4111-8111-111111111111',
    status: 'OPEN',
    subject: 'MATHEMATICS',
    packageId: '22222222-2222-4222-8222-222222222222',
    questionId: '44444444-4444-4444-8444-444444444444',
    examLanguage: 'en',
    errorCause: null,
    errorCount: 1,
    assistanceSummary: { maxTierDisclosed: 0, strongUsed: false, languageAssistUsed: false },
    revalidationEligible: false,
    lastSessionId: null,
    stemPreview: [{ kind: 'TEXT', text: 'First open item' }],
    updatedAt: '2026-08-13T00:00:00Z',
    ...overrides,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <MistakesPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

test('keeps prose math inline while clamping standalone math previews', async () => {
  vi.spyOn(api, 'listMistakes').mockResolvedValueOnce({
    items: [
      row({
        stemPreview: [
          { kind: 'TEXT', text: '设 \\(A=\\{1,3,5\\}\\)，下列正确的是' },
          { kind: 'MATH', latex: 'x^2', displayMode: true },
        ],
      }),
    ],
    nextCursor: null,
  });
  const style = document.createElement('style');
  style.textContent = readFileSync('src/features/assessment/assessment.css', 'utf8');
  document.head.append(style);
  try {
    const { container } = renderPage();
    await screen.findByText(/下列正确的是/);
    const inline = container.querySelector('.learn-text-block .learn-math');
    const standalone = container.querySelector('.learn-content-block-math > .learn-math');
    expect(inline).not.toBeNull();
    expect(standalone).not.toBeNull();
    // jsdom does not lay out WebKit line clamps; check their selector targets.
    const clampRules = Array.from(style.sheet!.cssRules).filter(
      (rule): rule is CSSStyleRule =>
        'selectorText' in rule &&
        'style' in rule &&
        (rule as CSSStyleRule).style.getPropertyValue('-webkit-line-clamp') === '3',
    );
    expect(clampRules.some((rule) => inline!.matches(rule.selectorText))).toBe(false);
    expect(clampRules.some((rule) => standalone!.matches(rule.selectorText))).toBe(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } finally {
    style.remove();
  }
});

test('uses server status filter and load more instead of a client-only first page', async () => {
  const list = vi.spyOn(api, 'listMistakes').mockResolvedValueOnce({
    items: [row()],
    nextCursor: 'cursor-2',
  });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('First open item')).toBeInTheDocument();
  });
  expect(list).toHaveBeenCalledWith({
    limit: 20,
  });
  expect(screen.getByText(/open a missed question/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /load more|muat lagi|加载更多/i })).toBeInTheDocument();

  list.mockResolvedValueOnce({
    items: [
      row({
        mistakeId: '66666666-6666-4666-8666-666666666666',
        status: 'AWAITING_REVALIDATION',
        revalidationEligible: true,
        stemPreview: [{ kind: 'TEXT', text: 'Ready item' }],
      }),
    ],
    nextCursor: null,
  });

  fireEvent.click(screen.getByRole('button', { name: /^ready$|^siap$|^待复测$/i }));

  await waitFor(() => {
    expect(list).toHaveBeenLastCalledWith({
      status: 'AWAITING_REVALIDATION',
      limit: 20,
    });
  });
  expect(screen.getByRole('button', { name: /^ready$|^siap$|^待复测$/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('keeps status filters when the selected bucket is empty', async () => {
  const list = vi.spyOn(api, 'listMistakes').mockResolvedValueOnce({
    items: [row()],
    nextCursor: null,
  });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('First open item')).toBeInTheDocument();
  });

  list.mockResolvedValueOnce({ items: [], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: /^passed$|^lulus$|^已通过$/i }));

  await waitFor(() => {
    expect(
      screen.getByText(/nothing in this filter|tidak ada di filter|此筛选/i),
    ).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: /^all$|^semua$|^全部$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^open$|^terbuka$|^待处理$/i })).toBeInTheDocument();
});

test('keeps status filters when the list request fails', async () => {
  vi.spyOn(api, 'listMistakes').mockRejectedValueOnce(
    new ApiError(500, { title: 'load failed', code: 'UNAVAILABLE' }),
  );

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: /^all$|^semua$|^全部$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^open$|^terbuka$|^待处理$/i })).toBeInTheDocument();
});

test('reloads the first page when load more hits a stale status cursor', async () => {
  const list = vi.spyOn(api, 'listMistakes').mockResolvedValueOnce({
    items: [row()],
    nextCursor: 'cursor-open',
  });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('First open item')).toBeInTheDocument();
  });

  list.mockResolvedValueOnce({
    items: [row()],
    nextCursor: 'cursor-open',
  });
  fireEvent.click(screen.getByRole('button', { name: /^open$|^terbuka$|^待处理$/i }));
  await waitFor(() => {
    expect(list).toHaveBeenLastCalledWith({
      status: 'OPEN',
      limit: 20,
    });
  });

  list.mockRejectedValueOnce(
    new ApiError(400, {
      title: 'Invalid cursor',
      code: 'ASSESSMENT_VALIDATION_FAILED',
      violations: [{ field: 'cursor', code: 'INCOMPATIBLE' }],
    }),
  );
  list.mockResolvedValueOnce({
    items: [
      row({
        mistakeId: '77777777-7777-4777-8777-777777777777',
        stemPreview: [{ kind: 'TEXT', text: 'Still open item' }],
      }),
    ],
    nextCursor: null,
  });

  fireEvent.click(screen.getByRole('button', { name: /load more|muat lagi|加载更多/i }));

  await waitFor(() => {
    expect(screen.getByText('Still open item')).toBeInTheDocument();
  });
  expect(list).toHaveBeenLastCalledWith({
    status: 'OPEN',
    limit: 20,
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
