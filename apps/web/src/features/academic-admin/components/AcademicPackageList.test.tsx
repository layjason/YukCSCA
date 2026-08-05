import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AcademicPackageList } from './AcademicPackageList';
import type { AcademicPackageSummary } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'admin.academic.title') return 'Academic Packages';
      if (key === 'admin.academic.subtitle') return 'Configure 2025 CSCA Mathematics syllabus';
      if (key === 'admin.academic.createPackage') return 'Create Mathematics Package';
      if (key === 'admin.academic.editPackage') return 'Edit Package';
      if (key === 'admin.academic.statusDraft') return 'Draft';
      if (key === 'admin.academic.statusPublished') return 'Published';
      if (key === 'admin.academic.hasUnpublishedChanges') return 'Pending Changes';
      if (key === 'admin.academic.noActiveRevision') return 'No published revision yet';
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
    expect(screen.getByText(/Pending Changes/)).toBeInTheDocument();
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

    const buttons = screen.getAllByRole('button', { name: /\+ Create Mathematics Package/i });
    expect(buttons[0]).toBeDefined();
    if (buttons[0]) {
      fireEvent.click(buttons[0]);
    }
    expect(handleCreate).toHaveBeenCalled();
  });
});
