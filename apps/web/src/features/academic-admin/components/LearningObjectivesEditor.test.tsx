import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { LearningObjectivesEditor } from './LearningObjectivesEditor';
import type { LearningObjective, SyllabusOutlineItem } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { index?: number }) => {
      if (key === 'admin.academic.objectives.title') return 'Learning Objectives';
      if (key === 'admin.academic.objectives.addObjective') return 'Add Objective';
      if (key === 'admin.academic.objectives.empty') return 'No learning objectives yet.';
      if (key === 'admin.academic.objectives.untitled') return `Objective ${opts?.index ?? 1}`;
      if (key === 'admin.academic.objectives.editTitle') return 'Edit learning objective';
      if (key === 'admin.academic.objectives.mappings') return 'Topic mappings';
      if (key === 'admin.academic.objectives.addMapping') return 'Add mapping';
      if (key === 'admin.academic.objectives.outlineItem') return 'Outline item';
      if (key === 'admin.academic.objectives.rationale') return 'Mapping rationale';
      if (key === 'admin.academic.outline.summaryId') return 'Indonesian Summary (id)';
      if (key === 'admin.academic.outline.summaryEn') return 'English Summary (en)';
      if (key === 'admin.academic.outline.summaryZh') return 'Simplified Chinese Summary (zh-CN)';
      return key;
    },
  }),
}));

const outlineItems: SyllabusOutlineItem[] = [
  {
    id: 'out-1',
    parentId: null,
    order: 0,
    sourcePosition: { page: 1, section: '1.1' },
    summary: { indonesian: 'Aljabar', english: 'Algebra', simplifiedChinese: '代数' },
  },
];

describe('LearningObjectivesEditor', () => {
  test('adds an objective mapped to the first outline item', () => {
    const onChange = vi.fn();
    render(
      <LearningObjectivesEditor objectives={[]} outlineItems={outlineItems} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Objective/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as LearningObjective[];
    expect(next).toHaveLength(1);
    expect(next[0]?.mappings[0]?.outlineItemId).toBe('out-1');
  });
});
