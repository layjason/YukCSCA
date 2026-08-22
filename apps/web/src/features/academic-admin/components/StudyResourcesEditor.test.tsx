import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { StudyResourcesEditor } from './StudyResourcesEditor';
import type { LearningObjective, StudyResource, SyllabusOutlineItem, TermDraft } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { index?: number; name?: string }) => {
      const map: Record<string, string> = {
        'admin.academic.resources.title': 'Study Resources',
        'admin.academic.resources.kindLesson': 'Lesson',
        'admin.academic.resources.kindTerminology': 'Terminology',
        'admin.academic.resources.kindRemediation': 'Remediation',
        'admin.academic.resources.requiredKindsHint': 'Need one of each kind.',
        'admin.academic.resources.missing': 'needed',
        'admin.academic.resources.empty': 'No study resources yet.',
        'admin.academic.resources.untitled': `Resource ${opts?.index ?? 1}`,
        'admin.academic.resources.editTitle': 'Edit study resource',
        'admin.academic.resources.duplicate': 'Duplicate',
        'admin.academic.resources.remove': 'Remove resource',
        'admin.academic.resources.kind': 'Resource kind',
        'admin.academic.resources.outlineRefs': 'Mapped outline items',
        'admin.academic.resources.objectiveRefs': 'Mapped learning objectives',
        'admin.academic.resources.content': 'Resource content',
        'admin.academic.outline.summaryId': 'Indonesian',
        'admin.academic.outline.summaryEn': 'English',
        'admin.academic.outline.summaryZh': 'Chinese',
        'admin.academic.toasts.duplicated': `${opts?.name ?? ''} duplicated.`,
        'admin.academic.toasts.names.resource': 'Study resource',
        'admin.academic.terms.requiredSet': 'Required terms for this preview',
        'admin.academic.terms.untitled': `Untitled term ${opts?.index ?? 1}`,
      };
      return map[key] ?? key;
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

const objectives: LearningObjective[] = [
  {
    id: 'obj-1',
    title: { indonesian: 'Tujuan', english: 'Objective', simplifiedChinese: '目标' },
    mappings: [{ outlineItemId: 'out-1', rationale: 'covers topic' }],
  },
];

function lessonResource(overrides: Partial<StudyResource> = {}): StudyResource {
  return {
    id: 'res-1',
    kind: 'LESSON',
    title: { indonesian: 'Pelajaran', english: 'Lesson one', simplifiedChinese: '课程一' },
    outlineItemIds: ['out-1'],
    objectiveIds: ['obj-1'],
    versions: [{ language: 'en', blocks: [{ kind: 'TEXT', text: 'Body' }] }],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: null,
      reviewedAt: null,
    },
    ...overrides,
  };
}

describe('StudyResourcesEditor', () => {
  test('duplicates the selected resource with a new id and selects the clone', () => {
    const onChange = vi.fn();
    const source = lessonResource();
    render(
      <StudyResourcesEditor
        resources={[source]}
        outlineItems={outlineItems}
        objectives={objectives}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as StudyResource[];
    expect(next).toHaveLength(2);
    expect(next[0]?.id).toBe('res-1');
    expect(next[1]?.id).not.toBe('res-1');
    expect(next[1]?.title.english).toBe('Lesson one');
    expect(next[1]?.kind).toBe('LESSON');
  });

  test('renders three equal-width kind actions under the section title', () => {
    render(
      <StudyResourcesEditor
        resources={[]}
        outlineItems={outlineItems}
        objectives={objectives}
        onChange={vi.fn()}
      />,
    );

    const group = document.querySelector('.admin-equal-actions');
    expect(group).toHaveAttribute('data-count', '3');
    expect(group?.querySelectorAll('button')).toHaveLength(3);
  });

  test('lists required preview terms by Chinese surface, not UUID', () => {
    const termId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const terms: TermDraft[] = [
      {
        id: termId,
        termClass: 'TOPIC_TERM',
        surfaceForms: [
          { text: '导数', pinyin: 'dǎo shù' },
          { text: '微商', pinyin: 'wēi shāng' },
        ],
        definitions: { indonesian: '', english: '', simplifiedChinese: '' },
        englishEquivalent: 'derivative',
        outlineItemIds: ['out-1'],
      },
    ];
    render(
      <StudyResourcesEditor
        resources={[lessonResource({ kind: 'TERMINOLOGY', requiredTermIds: [termId] })]}
        outlineItems={outlineItems}
        objectives={objectives}
        terms={terms}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: '导数 (微商)' })).toBeChecked();
    expect(screen.queryByText(termId)).not.toBeInTheDocument();
  });
});
