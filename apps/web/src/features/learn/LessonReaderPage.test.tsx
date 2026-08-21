import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { LessonReaderPage } from './LessonReaderPage';
import * as learnApi from './api/learnApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import * as assessmentApi from '@/features/assessment/api/assessmentApi';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import type { PublishedLessonDetail } from './types';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

const baseLesson: PublishedLessonDetail = {
  packageId: '11111111-1111-4111-8111-111111111111',
  packageRevisionId: '22222222-2222-4222-8222-222222222222',
  subject: 'MATHEMATICS',
  resourceId: '33333333-3333-4333-8333-333333333333',
  title: {
    english: 'Polynomial factorisation',
    indonesian: 'Faktorisasi polinomial',
    simplifiedChinese: '多项式因式分解',
  },
  availableExplanationLanguages: ['id', 'en', 'zh-CN'],
  requestedExplanationLanguage: 'id',
  body: {
    availability: 'AVAILABLE',
    blocks: [
      { kind: 'TEXT', text: 'Teks pelajaran bahasa Indonesia.' },
      { kind: 'MATH', latex: 'x^2-1', displayMode: true },
    ],
  },
  contentProgress: {
    status: 'NOT_STARTED',
    resumeBlockIndex: null,
    updatedAt: null,
    updatedSinceCompleted: false,
  },
};

function renderReader(path = `/app/learn/MATHEMATICS/lessons/${baseLesson.resourceId}`) {
  return render(
    <I18nextProvider i18n={i18n}>
      <div className="app-content-wrapper" data-testid="shell-scroller">
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/learn/:subject/lessons/:resourceId" element={<LessonReaderPage />} />
            <Route
              path="/app/learn/:subject/terminology/:resourceId"
              element={<h1>Preview destination</h1>}
            />
          </Routes>
        </MemoryRouter>
      </div>
    </I18nextProvider>,
  );
}

function mockProfile(lang: 'id' | 'en' | 'zh-CN' = 'id') {
  vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Ayu',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: lang,
    createdAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
  });
}

test('loads lesson with profile default language and seeds in-progress progress', async () => {
  mockProfile('id');
  const getLesson = vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue(baseLesson);
  const upsert = vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-07T00:00:00Z',
    updatedSinceCompleted: false,
  });

  renderReader();

  expect(
    await screen.findByRole('heading', { name: /Faktorisasi polinomial/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Teks pelajaran bahasa Indonesia/i)).toBeInTheDocument();
  await waitFor(() => {
    expect(getLesson).toHaveBeenCalledWith('MATHEMATICS', baseLesson.resourceId, 'id');
  });
  await waitFor(() => {
    expect(upsert).toHaveBeenCalledWith(
      'MATHEMATICS',
      baseLesson.resourceId,
      expect.objectContaining({ status: 'IN_PROGRESS' }),
    );
  });
});

test('unfinished preview redirects before seeding lesson progress', async () => {
  mockProfile('id');
  const previewId = '44444444-4444-4444-8444-444444444444';
  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue({
    ...baseLesson,
    terminology: { previewResourceId: previewId, rail: [], spans: [] },
  });
  const upsert = vi.spyOn(learnApi, 'upsertContentProgress');
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockResolvedValue({
    packageId: baseLesson.packageId,
    packageRevisionId: baseLesson.packageRevisionId,
    subject: 'MATHEMATICS',
    resourceId: previewId,
    title: baseLesson.title,
    outlineItemIds: [],
    lessonResourceIds: [baseLesson.resourceId],
    requestedExplanationLanguage: 'id',
    terms: [],
    matchingPairsAvailable: false,
    matchTargets: [],
    previewProgress: {
      status: 'IN_PROGRESS',
      updatedAt: '2026-08-18T00:00:00Z',
      requiredSetUpdatedSinceCompleted: false,
    },
  });

  renderReader();

  expect(await screen.findByRole('heading', { name: /Preview destination/i })).toBeInTheDocument();
  expect(upsert).not.toHaveBeenCalled();
  expect(screen.queryByText(/Teks pelajaran bahasa Indonesia/i)).not.toBeInTheDocument();
});

test('shows a neutral required-set notice with a review link', async () => {
  mockProfile('id');
  const previewId = '44444444-4444-4444-8444-444444444444';
  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue({
    ...baseLesson,
    terminology: { previewResourceId: previewId, rail: [], spans: [] },
  });
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-18T00:00:00Z',
    updatedSinceCompleted: false,
  });
  vi.spyOn(terminologyApi, 'getTerminologyPreview').mockResolvedValue({
    packageId: baseLesson.packageId,
    packageRevisionId: baseLesson.packageRevisionId,
    subject: 'MATHEMATICS',
    resourceId: previewId,
    title: baseLesson.title,
    outlineItemIds: [],
    lessonResourceIds: [baseLesson.resourceId],
    requestedExplanationLanguage: 'id',
    terms: [],
    matchingPairsAvailable: false,
    matchTargets: [],
    previewProgress: {
      status: 'PREVIEW_COMPLETE',
      updatedAt: '2026-08-18T00:00:00Z',
      requiredSetUpdatedSinceCompleted: true,
    },
  });

  renderReader();

  const notice = await screen.findByText(/required terms changed/i);
  expect(notice.closest('.learn-update-notice')).not.toBeNull();
  expect(notice.closest('.learn-update-banner')).toBeNull();
  expect(screen.getByRole('link', { name: /review updated terms/i })).toHaveAttribute(
    'href',
    `/app/learn/MATHEMATICS/terminology/${previewId}?lessonResourceId=${baseLesson.resourceId}`,
  );
});

test('refreshes a linked mistake after lesson study starts', async () => {
  mockProfile('id');
  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue(baseLesson);
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-07T00:00:00Z',
    updatedSinceCompleted: false,
  });
  const getMistake = vi.spyOn(assessmentApi, 'getMistake').mockResolvedValue({
    mistakeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'REMEDIATION_IN_PROGRESS',
  } as never);

  renderReader(
    `/app/learn/MATHEMATICS/lessons/${baseLesson.resourceId}?mistakeId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
  );

  await waitFor(() => {
    expect(getMistake).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });
});

test('language toggle keeps the previous lesson body mounted while the next language loads', async () => {
  mockProfile('en');
  const english: PublishedLessonDetail = {
    ...baseLesson,
    requestedExplanationLanguage: 'en',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'English body' }],
    },
    contentProgress: {
      status: 'IN_PROGRESS',
      resumeBlockIndex: 0,
      updatedAt: '2026-08-07T00:00:00Z',
      updatedSinceCompleted: false,
    },
  };
  const indonesian: PublishedLessonDetail = {
    ...english,
    requestedExplanationLanguage: 'id',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'Teks pelajaran bahasa Indonesia.' }],
    },
  };

  let resolveSecond: ((value: PublishedLessonDetail) => void) | undefined;
  const secondLoad = new Promise<PublishedLessonDetail>((resolve) => {
    resolveSecond = resolve;
  });
  vi.spyOn(learnApi, 'getPublishedLesson')
    .mockResolvedValueOnce(english)
    .mockImplementationOnce(() => secondLoad);
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-07T00:00:00Z',
    updatedSinceCompleted: false,
  });

  renderReader();
  expect(await screen.findByText(/English body/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Polynomial factorisation/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Indonesian|Indonesia|Bahasa/i }));

  expect(screen.getByText(/English body/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Polynomial factorisation/i })).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: /Faktorisasi polinomial/i }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: i18n.t('learn.loading') })).not.toBeInTheDocument();
  await waitFor(() => {
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/English body/i)).toBeInTheDocument();
  });
  expect(screen.getByRole('article')).toHaveClass('is-reloading');

  resolveSecond?.(indonesian);
  expect(await screen.findByText(/Teks pelajaran bahasa Indonesia/i)).toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: /Faktorisasi polinomial/i }),
  ).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('article')).not.toHaveAttribute('aria-busy');
  });
  expect(screen.getByRole('article')).not.toHaveClass('is-reloading');
});

test('language toggle keeps the checkpoint handoff mounted while the next language loads', async () => {
  mockProfile('en');
  const english: PublishedLessonDetail = {
    ...baseLesson,
    requestedExplanationLanguage: 'en',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'English body' }],
    },
    contentProgress: {
      status: 'CONTENT_COMPLETE',
      resumeBlockIndex: 0,
      updatedAt: '2026-08-07T00:00:00Z',
      updatedSinceCompleted: false,
    },
  };
  const indonesian: PublishedLessonDetail = {
    ...english,
    requestedExplanationLanguage: 'id',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'Teks pelajaran bahasa Indonesia.' }],
    },
  };

  let resolveSecond: ((value: PublishedLessonDetail) => void) | undefined;
  const secondLoad = new Promise<PublishedLessonDetail>((resolve) => {
    resolveSecond = resolve;
  });
  vi.spyOn(learnApi, 'getPublishedLesson')
    .mockResolvedValueOnce(english)
    .mockImplementationOnce(() => secondLoad);
  vi.spyOn(assessmentApi, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: baseLesson.packageId,
    packageRevisionId: baseLesson.packageRevisionId,
    lessonResourceId: baseLesson.resourceId,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        examLanguage: 'en',
        title: { english: 'Checkpoint', indonesian: 'Checkpoint', simplifiedChinese: '检查点' },
        questionCount: 3,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });
  vi.spyOn(assessmentApi, 'listAssessmentSessions').mockResolvedValue([
    {
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      purpose: 'CHECKPOINT',
      subject: 'MATHEMATICS',
      status: 'SUBMITTED',
      packageId: baseLesson.packageId,
      packageRevisionId: baseLesson.packageRevisionId,
      setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      mistakeId: null,
      title: { english: 'Checkpoint', indonesian: 'Checkpoint', simplifiedChinese: '检查点' },
      examLanguage: 'en',
      questionCount: 3,
      answeredItemCount: 3,
      lockedItemCount: 3,
      feedbackMode: 'IMMEDIATE',
      lessonResourceId: baseLesson.resourceId,
      updatedAt: '2026-08-06T00:00:00Z',
    },
  ]);
  vi.spyOn(assessmentApi, 'getAssessmentSession').mockResolvedValue({
    sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    purpose: 'CHECKPOINT',
    subject: 'MATHEMATICS',
    status: 'SUBMITTED',
    feedbackMode: 'IMMEDIATE',
    examLanguage: 'en',
    packageId: baseLesson.packageId,
    packageRevisionId: baseLesson.packageRevisionId,
    setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    items: [],
    context: {
      packageId: baseLesson.packageId,
      packageRevisionId: baseLesson.packageRevisionId,
      setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      lessonResourceId: baseLesson.resourceId,
      checkpointPassed: true,
    },
    assistanceSummary: {
      totalHintsDisclosed: 0,
      strongAssistanceUsed: false,
    },
  } as never);

  renderReader();
  expect(await screen.findByText(/English body/i)).toBeInTheDocument();
  const checkpoint = await screen.findByText(/Checkpoint completed/i);
  expect(checkpoint).toBeInTheDocument();

  const scroller = screen.getByTestId('shell-scroller');
  scroller.scrollTop = 40;

  const column = screen.getByText(/English body/i).closest('.learn-reader-with-rail');
  expect(column).toBeTruthy();
  Object.defineProperty(column as HTMLElement, 'offsetHeight', {
    configurable: true,
    get: () => 1400,
  });

  fireEvent.click(screen.getByRole('button', { name: /Indonesian|Indonesia|Bahasa/i }));

  expect(screen.getByText(/Checkpoint completed/i)).toBe(checkpoint);
  expect(screen.getByText(/English body/i)).toBeInTheDocument();
  expect(column).toHaveStyle({ minHeight: '1400px' });
  expect(scroller.scrollTop).toBe(40);

  resolveSecond?.(indonesian);
  expect(await screen.findByText(/Teks pelajaran bahasa Indonesia/i)).toBeInTheDocument();
  expect(screen.getByText(/Checkpoint completed/i)).toBe(checkpoint);
  expect(column).toHaveStyle({ minHeight: '1400px' });
  expect(scroller.scrollTop).toBe(40);
});

test('language toggle reloads requested language without silent fallback on unavailable', async () => {
  mockProfile('en');
  const availableWithZh: PublishedLessonDetail = {
    ...baseLesson,
    requestedExplanationLanguage: 'en',
    // Chip stays enabled so the student can request zh-CN; server then returns unavailable.
    availableExplanationLanguages: ['en', 'id', 'zh-CN'],
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'English body' }],
    },
    contentProgress: {
      status: 'IN_PROGRESS',
      resumeBlockIndex: 0,
      updatedAt: '2026-08-07T00:00:00Z',
      updatedSinceCompleted: false,
    },
  };
  const unavailable: PublishedLessonDetail = {
    ...availableWithZh,
    requestedExplanationLanguage: 'zh-CN',
    availableExplanationLanguages: ['en', 'id'],
    body: { availability: 'LANGUAGE_UNAVAILABLE', requestedLanguage: 'zh-CN' },
  };

  vi.spyOn(learnApi, 'getPublishedLesson')
    .mockResolvedValueOnce(availableWithZh)
    .mockResolvedValueOnce(unavailable);
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-07T00:00:00Z',
    updatedSinceCompleted: false,
  });

  renderReader();
  expect(await screen.findByText(/English body/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Chinese|中文|Tionghoa/i }));

  expect(await screen.findByText(/language is not available/i)).toBeInTheDocument();
  expect(screen.queryByText(/English body/i)).not.toBeInTheDocument();
});

test('mark content complete uses authoritative response', async () => {
  mockProfile('en');
  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue({
    ...baseLesson,
    requestedExplanationLanguage: 'en',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'English body' }],
    },
    contentProgress: {
      status: 'IN_PROGRESS',
      resumeBlockIndex: 0,
      updatedAt: '2026-08-07T00:00:00Z',
      updatedSinceCompleted: false,
    },
  });
  vi.spyOn(learnApi, 'upsertContentProgress').mockImplementation(async (_s, _r, request) => {
    if (request.status === 'CONTENT_COMPLETE') {
      return {
        status: 'CONTENT_COMPLETE',
        resumeBlockIndex: 0,
        updatedAt: '2026-08-07T01:00:00Z',
        updatedSinceCompleted: false,
      };
    }
    return {
      status: 'IN_PROGRESS',
      resumeBlockIndex: request.resumeBlockIndex ?? 0,
      updatedAt: '2026-08-07T00:30:00Z',
      updatedSinceCompleted: false,
    };
  });

  renderReader();
  expect(await screen.findByText(/English body/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Mark as done/i }));
  await waitFor(() => {
    expect(screen.getAllByText(/Done — you can re-read anytime/i).length).toBeGreaterThan(0);
  });
  expect(screen.getByText(/^Done$/i)).toBeInTheDocument();
  expect(screen.queryByText(/Mastered/i)).not.toBeInTheDocument();
});

test('shows soft update banner and review action when content republished after complete', async () => {
  mockProfile('en');
  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue({
    ...baseLesson,
    packageRevisionId: '99999999-9999-4999-8999-999999999999',
    requestedExplanationLanguage: 'en',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'Updated lesson body' }],
    },
    contentProgress: {
      status: 'CONTENT_COMPLETE',
      resumeBlockIndex: 0,
      updatedAt: '2026-08-07T00:00:00Z',
      updatedSinceCompleted: true,
    },
  });
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'CONTENT_COMPLETE',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-08T00:00:00Z',
    updatedSinceCompleted: false,
  });
  // Lesson soft-update must keep checkpoint handoff (last result / retry / practice) visible.
  vi.spyOn(assessmentApi, 'getCheckpointForLesson').mockResolvedValue({
    subject: 'MATHEMATICS',
    packageId: baseLesson.packageId,
    packageRevisionId: '99999999-9999-4999-8999-999999999999',
    lessonResourceId: baseLesson.resourceId,
    lessonContentComplete: true,
    startable: true,
    lockReason: null,
    checkpointUpdatedSinceLastAttempt: false,
    editions: [
      {
        setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        examLanguage: 'en',
        title: { english: 'Checkpoint', indonesian: 'Checkpoint', simplifiedChinese: '检查点' },
        questionCount: 3,
        estimatedMinutes: 10,
        feedbackMode: 'IMMEDIATE',
        passPolicy: 'ALL_CORRECT_NO_STRONG_ASSISTANCE',
      },
    ],
  });
  vi.spyOn(assessmentApi, 'listAssessmentSessions').mockResolvedValue([
    {
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      purpose: 'CHECKPOINT',
      subject: 'MATHEMATICS',
      status: 'SUBMITTED',
      packageId: baseLesson.packageId,
      packageRevisionId: baseLesson.packageRevisionId,
      setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      mistakeId: null,
      title: { english: 'Checkpoint', indonesian: 'Checkpoint', simplifiedChinese: '检查点' },
      examLanguage: 'en',
      questionCount: 3,
      answeredItemCount: 3,
      lockedItemCount: 3,
      feedbackMode: 'IMMEDIATE',
      lessonResourceId: baseLesson.resourceId,
      updatedAt: '2026-08-06T00:00:00Z',
    },
  ]);
  vi.spyOn(assessmentApi, 'getAssessmentSession').mockResolvedValue({
    sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    purpose: 'CHECKPOINT',
    subject: 'MATHEMATICS',
    status: 'SUBMITTED',
    feedbackMode: 'IMMEDIATE',
    examLanguage: 'en',
    packageId: baseLesson.packageId,
    packageRevisionId: baseLesson.packageRevisionId,
    setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    items: [],
    context: {
      packageId: baseLesson.packageId,
      packageRevisionId: baseLesson.packageRevisionId,
      setId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      lessonResourceId: baseLesson.resourceId,
      checkpointPassed: true,
    },
    assistanceSummary: {
      totalHintsDisclosed: 0,
      strongAssistanceUsed: false,
    },
  } as never);

  renderReader();
  expect(await screen.findByText(/Updated lesson body/i)).toBeInTheDocument();
  expect(screen.getByText(/updated since you last finished/i)).toBeInTheDocument();
  expect(
    await screen.findByText(/Lesson reading was updated, but this checkpoint is still the same/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /View last result/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Retry checkpoint/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Mark as reviewed/i }));
  await waitFor(() => {
    expect(screen.queryByText(/updated since you last finished/i)).not.toBeInTheDocument();
  });
  expect(screen.getByText(/^Done$/i)).toBeInTheDocument();
});

test('activating an inline lesson term opens the compact gloss bubble and allows bookmarking', async () => {
  mockProfile('en');
  const termId = '55555555-5555-4555-8555-555555555555';
  const lessonWithTerms: PublishedLessonDetail = {
    ...baseLesson,
    requestedExplanationLanguage: 'en',
    body: {
      availability: 'AVAILABLE',
      blocks: [{ kind: 'TEXT', text: 'Study 因式分解 in mathematics.' }],
    },
    terminology: {
      previewResourceId: null,
      rail: [],
      spans: [
        {
          termId,
          surfaceForm: '因式分解',
          blockIndex: 0,
          startOffset: 6,
          endOffset: 10,
        },
      ],
    },
  };

  vi.spyOn(learnApi, 'getPublishedLesson').mockResolvedValue(lessonWithTerms);
  vi.spyOn(learnApi, 'upsertContentProgress').mockResolvedValue({
    status: 'IN_PROGRESS',
    resumeBlockIndex: 0,
    updatedAt: '2026-08-07T00:00:00Z',
    updatedSinceCompleted: false,
  });

  const lookupSpy = vi.spyOn(terminologyApi, 'resolveTermLookup').mockResolvedValue({
    outcome: 'MATCHED',
    alreadyInNotebook: false,
    entry: null,
    card: {
      termId,
      subject: 'MATHEMATICS',
      packageId: baseLesson.packageId,
      termClass: 'TOPIC_TERM',
      alreadyInNotebook: false,
      primarySurface: { text: '因式分解', pinyin: 'yīn shì fēn jiě', audioAvailable: false },
      aliases: [],
      definition: { availability: 'AVAILABLE', language: 'en', text: 'Factorisation' },
      englishEquivalent: 'factorisation',
      symbols: null,
      example: null,
      outlineItemIds: [],
    },
  });

  const bookmarkSpy = vi.spyOn(terminologyApi, 'bookmarkTerm').mockResolvedValue({
    alreadyInNotebook: true,
    entry: {
      termId,
      subject: 'MATHEMATICS',
      packageId: baseLesson.packageId,
      termClass: 'TOPIC_TERM',
      primarySurface: { text: '因式分解', pinyin: 'yīn shì fēn jiě', audioAvailable: false },
      familiarity: 'NEW',
      due: false,
      lastReviewAt: null,
      sources: ['CLICKED'],
      metIn: {
        source: 'CLICKED',
        place: 'LESSON',
        topicTitle: null,
        outlineItemId: null,
        at: '2026-08-07T00:00:00Z',
      },
      pendingReview: null,
    },
    card: {
      termId,
      subject: 'MATHEMATICS',
      packageId: baseLesson.packageId,
      termClass: 'TOPIC_TERM',
      alreadyInNotebook: true,
      primarySurface: { text: '因式分解', pinyin: 'yīn shì fēn jiě', audioAvailable: false },
      aliases: [],
      definition: { availability: 'AVAILABLE', language: 'en', text: 'Factorisation' },
      englishEquivalent: 'factorisation',
      symbols: null,
      example: null,
      outlineItemIds: [],
    },
  });

  renderReader();

  const chip = await screen.findByRole('button', { name: '因式分解' });
  expect(chip).toBeInTheDocument();

  fireEvent.click(chip);

  await waitFor(() => {
    expect(lookupSpy).toHaveBeenCalledWith({
      subject: 'MATHEMATICS',
      explanationLanguage: 'en',
      source: 'LESSON',
      termId,
      resourceId: baseLesson.resourceId,
    });
  });

  const gloss = await screen.findByRole('dialog', { name: /因式分解/i });
  expect(gloss).toHaveClass('term-gloss');
  expect(screen.getByText('Factorisation')).toBeInTheDocument();

  const bookmarkBtn = screen.getByRole('button', { name: /Bookmark 因式分解/i });
  fireEvent.click(bookmarkBtn);

  await waitFor(() => {
    expect(bookmarkSpy).toHaveBeenCalledWith(termId, {
      subject: 'MATHEMATICS',
      explanationLanguage: 'en',
      source: 'LESSON',
      resourceId: baseLesson.resourceId,
    });
  });

  expect(await screen.findByText(/Saved to your notebook/i)).toBeInTheDocument();
});
