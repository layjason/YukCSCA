import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AcademicPackageEditor } from './AcademicPackageEditor';
import * as academicAdminApi from '../api/academicAdminApi';
import type { AcademicPackage } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, opts?: { date?: string; name?: string; index?: number }) => {
      const map: Record<string, string> = {
        'admin.academic.statusDraft': 'Draft',
        'admin.academic.saveDraft': 'Save draft',
        'admin.academic.saving': 'Saving…',
        'admin.academic.publish': 'Publish',
        'admin.academic.archive': 'Archive',
        'admin.academic.backToList': '← All packages',
        'admin.academic.packageHeading': 'CSCA 2025 Mathematics Package',
        'admin.academic.subjectTag': 'Mathematics 2025',
        'admin.academic.tabsLabel': 'Academic package configuration sections',
        'admin.academic.tabs.source': 'Source & outline',
        'admin.academic.tabs.objectives': 'Objectives',
        'admin.academic.tabs.resources': 'Resources',
        'admin.academic.tabs.questions': 'Questions',
        'admin.academic.tabs.assessment': 'Assessment sets',
        'admin.academic.tabs.mock': 'Timed mock',
        'admin.academic.tabs.terms': 'Terms',
        'admin.academic.terms.title': 'Term bank',
        'admin.academic.terms.add': 'Add term',
        'admin.academic.terms.empty': 'No reviewed terms yet.',
        'admin.academic.terms.item': 'Term',
        'admin.academic.hasUnpublishedChanges': 'Pending changes',
        'admin.academic.noActiveRevision': 'Not published yet',
        'admin.academic.activeRevision': `Published ${opts?.date ?? ''}`,
        'admin.academic.lastUpdated': `Updated ${opts?.date ?? ''}`,
        'admin.academic.toasts.draftSaved': 'Draft saved successfully.',
        'admin.academic.toasts.published': `Published on ${opts?.date ?? ''}`,
        'admin.academic.toasts.added': `${opts?.name ?? ''} added.`,
        'admin.academic.toasts.removed': `${opts?.name ?? ''} removed.`,
        'admin.academic.toasts.duplicated': `${opts?.name ?? ''} duplicated.`,
        'admin.academic.toasts.names.objective': 'Learning objective',
        'admin.academic.objectives.title': 'Learning Objectives',
        'admin.academic.objectives.addObjective': 'Add Objective',
        'admin.academic.objectives.remove': 'Remove objective',
        'admin.academic.objectives.empty': 'No learning objectives yet.',
        'toast.dismiss': 'Dismiss',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockPackage: AcademicPackage = {
  id: 'pkg-1',
  subject: 'MATHEMATICS',
  status: 'DRAFT',
  draftRevision: 1,
  activeRevision: null,
  hasUnpublishedChanges: true,
  createdAt: '2026-07-31T00:00:00Z',
  updatedAt: '2026-07-31T00:00:00Z',
  draft: {
    officialSyllabus: {
      subject: 'MATHEMATICS',
      authority: 'CSCA',
      editionLabel: '2025 Edition',
      sourceLinks: [
        {
          language: 'en',
          url: 'https://csca.cn/files/CSCA%20Mathematics%20Examination%20Syllabus-2025.pdf',
        },
        {
          language: 'zh-CN',
          url: 'https://csca.cn/files/CSCA%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2-%E6%95%B0%E5%AD%A6-2025%E7%89%88.pdf',
        },
      ],
      retrievedAt: '2026-07-31T00:00:00Z',
      lastCheckedAt: '2026-07-31T00:00:00Z',
    },
    outlineItems: [
      {
        id: 'out-1',
        parentId: null,
        order: 1,
        sourcePosition: { page: 1, section: '1.1' },
        summary: {
          indonesian: 'Aljabar',
          english: 'Algebra',
          simplifiedChinese: '代数',
        },
      },
    ],
    learningObjectives: [],
    resources: [],
    questions: [],
    mocks: [],
  },
};

describe('AcademicPackageEditor', () => {
  test('renders header bar and official source panel', () => {
    render(<AcademicPackageEditor initialPackage={mockPackage} onBackToList={vi.fn()} />);

    expect(screen.getByText('CSCA 2025 Mathematics Package')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Publish$/i })).toBeInTheDocument();
  });

  test('switches through source, objectives, resources, questions, and mock tabs', () => {
    render(<AcademicPackageEditor initialPackage={mockPackage} onBackToList={vi.fn()} />);

    const tablist = screen.getByRole('navigation', {
      name: 'Academic package configuration sections',
    });

    const clickTab = (label: RegExp) => {
      const tab = tablist.querySelectorAll('button');
      const match = Array.from(tab).find((btn) => label.test(btn.textContent ?? ''));
      expect(match).toBeTruthy();
      fireEvent.click(match!);
      expect(match).toHaveClass('admin-tab-btn-active');
    };

    clickTab(/^Objectives/);
    clickTab(/^Resources/);
    clickTab(/^Questions/);
    clickTab(/^Timed mock/);
  });

  test('calls onBackToList when back button is clicked', () => {
    const handleBack = vi.fn();
    render(<AcademicPackageEditor initialPackage={mockPackage} onBackToList={handleBack} />);

    fireEvent.click(screen.getByRole('button', { name: /All packages/i }));
    expect(handleBack).toHaveBeenCalled();
  });

  test('toasts on add and dismisses from the close control', () => {
    render(<AcademicPackageEditor initialPackage={mockPackage} onBackToList={vi.fn()} />);

    const tablist = screen.getByRole('navigation', {
      name: 'Academic package configuration sections',
    });
    const objectivesTab = Array.from(tablist.querySelectorAll('button')).find((btn) =>
      /^Objectives/.test(btn.textContent ?? ''),
    );
    expect(objectivesTab).toBeTruthy();
    fireEvent.click(objectivesTab!);

    fireEvent.click(screen.getByRole('button', { name: /Add Objective/i }));
    const added = screen.getByRole('status');
    expect(added).toHaveTextContent('Learning objective added.');
    expect(added).toHaveClass('toast-success');

    fireEvent.click(screen.getByRole('button', { name: /Remove objective/i }));
    const removed = screen.getByRole('status');
    expect(removed).toHaveTextContent('Learning objective removed.');
    expect(removed).toHaveClass('toast-error');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('save draft round-trips lesson video attachments', async () => {
    const packageWithVideo: AcademicPackage = {
      ...mockPackage,
      draft: {
        ...mockPackage.draft,
        resources: [
          {
            id: 'res-lesson-1',
            kind: 'LESSON',
            title: {
              indonesian: 'Pelajaran',
              english: 'Lesson',
              simplifiedChinese: '课',
            },
            outlineItemIds: ['out-1'],
            objectiveIds: [],
            versions: [
              {
                language: 'en',
                blocks: [{ kind: 'TEXT', text: 'Lesson body' }],
              },
            ],
            requiredTermIds: [],
            videos: [
              {
                language: 'en',
                videoAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                sceneSpecificationId: null,
              },
            ],
            provenance: {
              origin: 'YUKCSCA_ORIGINAL',
              provider: null,
              sourceLocator: null,
              permissionReference: null,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: null,
              reviewedAt: null,
            },
          },
        ],
      },
    };
    const saveDraft = vi.spyOn(academicAdminApi, 'saveAcademicPackageDraft').mockResolvedValue({
      ...packageWithVideo,
      draftRevision: 2,
    });

    render(<AcademicPackageEditor initialPackage={packageWithVideo} onBackToList={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalled();
    });
    const draftInput = saveDraft.mock.calls[0]?.[2];
    expect(draftInput?.resources[0]?.videos).toEqual([
      {
        language: 'en',
        videoAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sceneSpecificationId: null,
      },
    ]);
    saveDraft.mockRestore();
  });

  test('auto-saves the draft when a render job succeeds with a new video asset id', async () => {
    const specId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const producedId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const packageWithSpec: AcademicPackage = {
      ...mockPackage,
      draft: {
        ...mockPackage.draft,
        resources: [
          {
            id: 'res-lesson-1',
            kind: 'LESSON',
            title: {
              indonesian: 'Pelajaran',
              english: 'Lesson',
              simplifiedChinese: '课',
            },
            outlineItemIds: ['out-1'],
            objectiveIds: [],
            versions: [
              {
                language: 'en',
                blocks: [{ kind: 'TEXT', text: 'Lesson body' }],
              },
            ],
            requiredTermIds: [],
            videos: [
              {
                language: 'en',
                videoAssetId: null,
                sceneSpecificationId: specId,
              },
            ],
            provenance: {
              origin: 'YUKCSCA_ORIGINAL',
              provider: null,
              sourceLocator: null,
              permissionReference: null,
              authorUserId: '00000000-0000-0000-0000-000000000001',
              reviewedByUserId: null,
              reviewedAt: null,
            },
          },
        ],
      },
    };
    vi.spyOn(academicAdminApi, 'getSceneSpecification').mockResolvedValue({
      id: specId,
      registryVersion: '2026-08.3',
      explanationLanguage: 'en',
      segments: [],
      latestRenderJob: {
        id: 'job-1',
        kind: 'RENDER_SCENE',
        state: 'SUCCEEDED',
        attempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sceneSpecificationId: specId,
        videoAssetId: producedId,
        error: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.spyOn(academicAdminApi, 'getAcademicVideo').mockResolvedValue({
      id: producedId,
      source: 'PRODUCED',
      status: 'DRAFT',
      explanationLanguage: 'en',
      mediaType: 'video/mp4',
      byteSize: 1024,
      durationSeconds: 12,
      width: 1280,
      height: 720,
      sha256: 'sha-produced',
      captionsAvailable: true,
      rejection: null,
      latestValidationJob: null,
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        provider: null,
        sourceLocator: null,
        permissionReference: null,
        authorUserId: '00000000-0000-0000-0000-000000000001',
        reviewedByUserId: null,
        reviewedAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const savedPackage: AcademicPackage = {
      ...packageWithSpec,
      draftRevision: 2,
      draft: {
        ...packageWithSpec.draft,
        resources: [
          {
            ...packageWithSpec.draft.resources[0]!,
            videos: [
              {
                language: 'en',
                videoAssetId: producedId,
                sceneSpecificationId: specId,
              },
            ],
          },
        ],
      },
    };
    const saveDraft = vi
      .spyOn(academicAdminApi, 'saveAcademicPackageDraft')
      .mockResolvedValue(savedPackage);

    render(<AcademicPackageEditor initialPackage={packageWithSpec} onBackToList={vi.fn()} />);
    const tablist = screen.getByRole('navigation', {
      name: 'Academic package configuration sections',
    });
    const resourcesTab = Array.from(tablist.querySelectorAll('button')).find((btn) =>
      /^Resources/.test(btn.textContent ?? ''),
    );
    expect(resourcesTab).toBeTruthy();
    fireEvent.click(resourcesTab!);

    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalled();
    });
    const draftInput = saveDraft.mock.calls[0]?.[2];
    expect(draftInput?.resources[0]?.videos).toEqual([
      {
        language: 'en',
        sceneSpecificationId: specId,
        videoAssetId: producedId,
      },
    ]);
    saveDraft.mockRestore();
  });
});
