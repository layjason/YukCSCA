import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AcademicPackageEditor } from './AcademicPackageEditor';
import type { AcademicPackage } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'admin.academic.statusDraft') return 'Draft';
      if (key === 'admin.academic.saveDraft') return 'Save Draft';
      if (key === 'admin.academic.saving') return 'Saving...';
      if (key === 'admin.academic.publish') return 'Review & Publish';
      if (key === 'admin.academic.archive') return 'Archive Package';
      if (key === 'admin.academic.sourcePanel.title') return 'Official Source';
      if (key === 'admin.academic.sourcePanel.openSyllabus') return 'Open official syllabus';
      if (key === 'admin.academic.outline.title') return 'Syllabus Outline';
      if (key === 'admin.academic.questions.title') return 'Questions & Scored Items';
      if (key === 'admin.academic.mock.title') return 'Timed Mock Paper';
      if (key === 'admin.academic.toasts.draftSaved') return 'Draft saved successfully.';
      return key;
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
      sourceUrl: 'https://csca.org.cn/syllabus-2025.pdf',
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

    expect(screen.getByText('CSCA 2025 Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review & Publish/i })).toBeInTheDocument();
  });

  test('switches tabs between Source/Outline, Questions, and Timed Mock', () => {
    render(<AcademicPackageEditor initialPackage={mockPackage} onBackToList={vi.fn()} />);

    // Switch to Questions tab
    const questionsTab = screen.getByRole('button', { name: /Questions & Scored Items/i });
    fireEvent.click(questionsTab);

    // Switch to Mock tab
    const mockTab = screen.getByRole('button', { name: /Timed Mock Paper/i });
    fireEvent.click(mockTab);

    expect(screen.getByText(/Timed Mock Paper/i)).toBeInTheDocument();
  });
});
