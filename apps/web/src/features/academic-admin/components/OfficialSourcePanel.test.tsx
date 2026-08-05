import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { OfficialSourcePanel } from './OfficialSourcePanel';
import type { OfficialSyllabus } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { date?: string; subject?: string }) => {
      if (key === 'admin.academic.sourcePanel.title') return 'Official Source';
      if (key === 'admin.academic.sourcePanel.checked') return `Checked ${opts?.date ?? ''}`;
      if (key === 'admin.academic.sourcePanel.notCheckedYet') return 'Not checked yet';
      if (key === 'admin.academic.sourcePanel.openSyllabus') return 'Open official syllabus';
      if (key === 'admin.academic.sourcePanel.opensInNewTab') return 'opens in new tab';
      if (key === 'admin.academic.sourcePanel.subjectHeading')
        return `${opts?.subject ?? ''} 2025 Syllabus`;
      if (key === 'admin.academic.sourcePanel.sourceUrlLabel') return 'Official Syllabus PDF Link';
      if (key === 'admin.academic.sourcePanel.authorityLabel') return 'Authority';
      if (key === 'admin.academic.sourcePanel.editionLabel') return 'Edition label';
      if (key === 'admin.academic.sourcePanel.permittedUse') return 'Permitted use';
      if (key === 'admin.academic.sourcePanel.referenceOnly') return 'Reference only';
      if (key === 'admin.academic.sourcePanel.retrievedAt') return 'Retrieved at';
      if (key === 'admin.academic.sourcePanel.lastCheckedAt') return 'Last checked at';
      if (key === 'admin.academic.sourcePanel.publishedOn') return 'Official published date';
      if (key === 'admin.academic.sourcePanel.effectiveOn') return 'Official effective date';
      if (key === 'admin.academic.sourcePanel.updatedOn') return 'Official updated date';
      if (key === 'admin.academic.sourcePanel.declaredDate') return 'Declared date';
      if (key === 'admin.academic.sourcePanel.notStated') return 'Not Stated';
      if (key === 'admin.academic.sourcePanel.declared') return 'Declared';
      if (key === 'admin.academic.sourcePanel.sourceLanguages') return 'Official source languages';
      if (key === 'admin.academic.sourcePanel.examStructure') return 'Exam structure snapshot';
      if (key === 'admin.academic.sourcePanel.examStructureFixed')
        return 'Fixed for Mathematics 2025';
      if (key === 'admin.academic.questions.examLangEn') return 'English (en)';
      if (key === 'admin.academic.questions.examLangZh') return 'Simplified Chinese (zh-CN)';
      return key;
    },
  }),
}));

describe('OfficialSourcePanel', () => {
  test('updates retrieved and checked timestamps and source languages', () => {
    const onChange = vi.fn();
    const syllabus: OfficialSyllabus = {
      subject: 'MATHEMATICS',
      authority: 'CSCA',
      editionLabel: '2025',
      sourceUrl: 'https://example.edu/syllabus.pdf',
      permittedUse: 'REFERENCE_ONLY',
      publishedOn: { status: 'NOT_STATED', date: null },
      effectiveOn: { status: 'NOT_STATED', date: null },
      updatedOn: { status: 'NOT_STATED', date: null },
    };

    render(<OfficialSourcePanel syllabus={syllabus} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Retrieved at'), {
      target: { value: '2026-07-31T08:00' },
    });
    expect(onChange).toHaveBeenCalled();
    const first = onChange.mock.calls.at(-1)?.[0] as OfficialSyllabus;
    expect(first.retrievedAt).toBeTruthy();

    const englishBoxes = screen.getAllByLabelText('English (en)');
    fireEvent.click(englishBoxes[0]!);
    const second = onChange.mock.calls.at(-1)?.[0] as OfficialSyllabus;
    expect(second.sourceLanguages).toContain('en');
  });

  test('emits explicit NOT_STATED official dates when fields were missing on load', () => {
    const onChange = vi.fn();
    // Backend create draft often omits these objects; UI must not only display a default.
    const syllabus: OfficialSyllabus = {
      subject: 'MATHEMATICS',
      authority: 'CSCA',
      editionLabel: '2025',
      sourceUrl: 'https://example.edu/syllabus.pdf',
      permittedUse: 'REFERENCE_ONLY',
    };

    render(<OfficialSourcePanel syllabus={syllabus} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Authority'), {
      target: { value: 'CSCA Official' },
    });

    const next = onChange.mock.calls.at(-1)?.[0] as OfficialSyllabus;
    expect(next.publishedOn).toEqual({ status: 'NOT_STATED', date: null });
    expect(next.effectiveOn).toEqual({ status: 'NOT_STATED', date: null });
    expect(next.updatedOn).toEqual({ status: 'NOT_STATED', date: null });
  });

  test('shows short field error under official published date', () => {
    render(
      <OfficialSourcePanel
        syllabus={{
          subject: 'MATHEMATICS',
          publishedOn: { status: 'NOT_STATED', date: null },
        }}
        onChange={vi.fn()}
        fieldErrors={{
          publishedOn: 'Choose Not stated, or Declared with a date.',
        }}
      />,
    );

    expect(
      screen.getByText('Choose Not stated, or Declared with a date.'),
    ).toBeInTheDocument();
  });
});
