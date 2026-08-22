import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { LessonTermRail } from './LessonTermRail';
import type { TermCard } from '@/shared/terminology/types';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';

const sampleRail: TermCard[] = [
  {
    termId: '11111111-1111-4111-8111-111111111111',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: false,
    primarySurface: { text: '集合', pinyin: 'jí hé', audioAvailable: true },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'himpunan' },
    englishEquivalent: 'set',
    symbols: 'A',
    example: '集合 A = {1, 2, 3}。',
    outlineItemIds: [],
  },
  {
    termId: '22222222-2222-4222-8222-222222222222',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: true,
    primarySurface: { text: '真空', pinyin: 'zhēn kōng', audioAvailable: false },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'ruang hampa' },
    englishEquivalent: 'vacuum',
    symbols: null,
    example: null,
    outlineItemIds: [],
  },
  {
    termId: '33333333-3333-4333-8333-333333333333',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: false,
    primarySurface: { text: '共线', pinyin: 'gòng xiàn', audioAvailable: false },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'kolinear' },
    englishEquivalent: 'collinear',
    symbols: null,
    example: null,
    outlineItemIds: [],
  },
  {
    termId: '44444444-4444-4444-8444-444444444444',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: false,
    primarySurface: { text: '点电荷', pinyin: 'diǎn diàn hè', audioAvailable: false },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'muatan titik' },
    englishEquivalent: 'point charge',
    symbols: null,
    example: null,
    outlineItemIds: [],
  },
  {
    termId: '55555555-5555-4555-8555-555555555555',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: false,
    primarySurface: { text: '场强', pinyin: 'chǎng qiáng', audioAvailable: false },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'kuat medan' },
    englishEquivalent: 'field strength',
    symbols: null,
    example: null,
    outlineItemIds: [],
  },
  {
    termId: '66666666-6666-4666-8666-666666666666',
    subject: 'MATHEMATICS',
    packageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    termClass: 'TOPIC_TERM',
    alreadyInNotebook: false,
    primarySurface: { text: '等量异种', pinyin: 'děng liàng yì zhǒng', audioAvailable: false },
    aliases: [],
    definition: { availability: 'AVAILABLE', language: 'id', text: 'sama besar berlawanan jenis' },
    englishEquivalent: 'equal opposite',
    symbols: null,
    example: null,
    outlineItemIds: [],
  },
];

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.restoreAllMocks();
});

function renderRail(rail: readonly TermCard[] = sampleRail) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LessonTermRail
          subject="MATHEMATICS"
          resourceId="res-123"
          explanationLanguage="id"
          rail={rail}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

test('renders topic terms list with hanzi, pinyin, and gloss preview without sloppy eyebrow', () => {
  renderRail();

  expect(screen.getByRole('heading', { name: /Topic terms/i })).toBeInTheDocument();
  expect(screen.queryByText(/LESSON VOCABULARY/i)).not.toBeInTheDocument();

  expect(screen.getByText('集合')).toBeInTheDocument();
  expect(screen.getByText('jí hé')).toBeInTheDocument();
  expect(screen.getByText('himpunan')).toBeInTheDocument();

  expect(screen.getByText('真空')).toBeInTheDocument();
  expect(screen.getByText('zhēn kōng')).toBeInTheDocument();
  expect(screen.getByText('ruang hampa')).toBeInTheDocument();

  // Representative notebook link
  expect(screen.getByRole('link', { name: /Term notebook|Terms|Notebook/i })).toBeInTheDocument();
});

test('renders pagination for more than 5 terms and allows navigating pages', () => {
  renderRail();

  // Page 1: terms 1 to 5
  expect(screen.getByText('集合')).toBeInTheDocument();
  expect(screen.getByText('场强')).toBeInTheDocument();
  expect(screen.queryByText('等量异种')).not.toBeInTheDocument();

  expect(screen.getByText('1–5')).toBeInTheDocument();

  // Click next page
  const nextPageBtn = screen.getByRole('button', { name: /Next page/i });
  fireEvent.click(nextPageBtn);

  // Page 2: term 6
  expect(screen.getByText('等量异种')).toBeInTheDocument();
  expect(screen.queryByText('集合')).not.toBeInTheDocument();
  expect(screen.getByText('6–6')).toBeInTheDocument();
});

test('renders empty message when rail has no terms', () => {
  renderRail([]);
  expect(screen.getByText(/No required terms on this lesson/i)).toBeInTheDocument();
});

test('selecting a term opens the in-rail inspector with stepper and full card details', async () => {
  vi.spyOn(terminologyApi, 'resolveTermLookup').mockResolvedValue({
    outcome: 'MATCHED',
    alreadyInNotebook: false,
    entry: null,
    card: sampleRail[0]!,
  });

  renderRail();

  const termCardBtn = screen.getByRole('button', { name: /集合, jí hé/i });
  fireEvent.click(termCardBtn);

  // Inspector top nav appears
  expect(await screen.findByRole('button', { name: /All terms/i })).toBeInTheDocument();
  expect(screen.getByText('1 / 6')).toBeInTheDocument();

  // Full details rendered
  expect(screen.getByText('set')).toBeInTheDocument();
  expect(screen.getByText(/集合 A = {1, 2, 3}。/)).toBeInTheDocument();

  // Next button switches to term 2
  const nextBtn = screen.getByRole('button', { name: /Next term/i });
  fireEvent.click(nextBtn);

  expect(screen.getByText('2 / 6')).toBeInTheDocument();
  expect(screen.getByText('vacuum')).toBeInTheDocument();

  // Back button returns to list view
  const allTermsBtn = screen.getByRole('button', { name: /All terms/i });
  fireEvent.click(allTermsBtn);

  expect(screen.getByRole('heading', { name: /Topic terms/i })).toBeInTheDocument();
  expect(screen.queryByText('1 / 6')).not.toBeInTheDocument();
});

test('toggling bookmark calls api and updates toast', async () => {
  const bookmarkSpy = vi.spyOn(terminologyApi, 'bookmarkTerm').mockResolvedValue({
    alreadyInNotebook: true,
    entry: {
      termId: sampleRail[0]!.termId,
      subject: 'MATHEMATICS',
      packageId: sampleRail[0]!.packageId,
      termClass: 'TOPIC_TERM',
      primarySurface: sampleRail[0]!.primarySurface,
      familiarity: 'NEW',
      due: false,
      lastReviewAt: null,
      sources: ['CLICKED'],
      metIn: {
        source: 'CLICKED',
        place: 'LESSON',
        topicTitle: null,
        outlineItemId: null,
        at: '2026-08-21T00:00:00Z',
      },
      pendingReview: null,
    },
    card: { ...sampleRail[0]!, alreadyInNotebook: true },
  });

  renderRail();

  const bookmarkBtn = screen.getByRole('button', { name: /Bookmark 集合/i });
  fireEvent.click(bookmarkBtn);

  await waitFor(() => {
    expect(bookmarkSpy).toHaveBeenCalledWith(sampleRail[0]!.termId, {
      subject: 'MATHEMATICS',
      explanationLanguage: 'id',
      source: 'LESSON',
      resourceId: 'res-123',
    });
  });

  expect(await screen.findByText(/Saved to your notebook/i)).toBeInTheDocument();
});
