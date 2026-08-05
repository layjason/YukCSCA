import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AcademicPackageList } from './AcademicPackageList';
import type { AcademicPackageSummary } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'admin.shell.workspace') return 'Admin workspace';
      if (key === 'admin.academic.title') return 'Academic Packages';
      if (key === 'admin.academic.subtitle') return 'Configure 2025 CSCA Mathematics syllabus';
      if (key === 'admin.academic.createPackage') return 'Create package';
      if (key === 'admin.academic.editPackage') return 'Open';
      if (key === 'admin.academic.statusDraft') return 'Draft';
      if (key === 'admin.academic.statusPublished') return 'Published';
      if (key === 'admin.academic.hasUnpublishedChanges') return 'Pending changes';
      if (key === 'admin.academic.noActiveRevision') return 'No published revision yet';
      if (key === 'admin.academic.emptyTitle') return 'No academic packages yet';
      if (key === 'admin.academic.emptyBody')
        return 'Initialize the first CSCA 2025 Mathematics preparation package to begin.';
      if (key === 'admin.academic.packageHeading') return 'CSCA 2025 Mathematics Package';
      if (key === 'admin.academic.subjectTag') return 'Mathematics 2025';
      if (key === 'admin.academic.draftRevision') return 'Draft rev 1';
      if (key === 'admin.academic.packageListLabel') return 'Package list';
      if (key === 'admin.academic.packageListHeading') return 'Your packages';
      if (key === 'admin.academic.packageCount') return `${opts?.count ?? 0} total`;
      if (key === 'admin.academic.loadingPackages') return 'Loading packages…';
      return key;
    },
  }),
}));

const mockPackages: AcademicPackageSummary[] = [
  {
    id: 'pkg-1',
    subject: 'MATHEMATICS',
    status: 'DRAFT',
    draftRevision: 1,
    activeRevision: null,
    hasUnpublishedChanges: true,
    updatedAt: '2026-07-31T00:00:00Z',
  },
];

describe('AcademicPackageList', () => {
  test('renders page title and package cards with status & hasUnpublishedChanges badge', () => {
    render(
      <AcademicPackageList
        packages={mockPackages}
        onCreatePackage={vi.fn()}
        onSelectPackage={vi.fn()}
      />,
    );

    expect(screen.getByText('Academic Packages')).toBeInTheDocument();
    expect(screen.getByText('CSCA 2025 Mathematics Package')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText(/Pending changes/i)).toBeInTheDocument();
  });

  test('calls onSelectPackage when package card is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <AcademicPackageList
        packages={mockPackages}
        onCreatePackage={vi.fn()}
        onSelectPackage={handleSelect}
      />,
    );

    fireEvent.click(screen.getByText('CSCA 2025 Mathematics Package'));
    expect(handleSelect).toHaveBeenCalledWith('pkg-1');
  });

  test('calls onCreatePackage when Create Package button is clicked', () => {
    const handleCreate = vi.fn();
    render(
      <AcademicPackageList
        packages={[]}
        onCreatePackage={handleCreate}
        onSelectPackage={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button', { name: /Create package/i });
    expect(buttons[0]).toBeDefined();
    if (buttons[0]) {
      fireEvent.click(buttons[0]);
    }
    expect(handleCreate).toHaveBeenCalled();
  });
});
