import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AcademicPackageEditor } from './AcademicPackageEditor';
import type { AcademicPackage } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
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
        'admin.academic.tabs.mock': 'Timed mock',
        'admin.academic.hasUnpublishedChanges': 'Pending changes',
        'admin.academic.noActiveRevision': 'No published revision yet',
        'admin.academic.draftRevision': 'Draft rev 1',
        'admin.academic.toasts.draftSaved': 'Draft saved successfully.',
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
});
