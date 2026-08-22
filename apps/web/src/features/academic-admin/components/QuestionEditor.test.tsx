import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { QuestionEditor } from './QuestionEditor';
import type { LearningObjective, Question, StudyResource, SyllabusOutlineItem } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { index?: number; language?: string; key?: string }) => {
      const map: Record<string, string> = {
        'admin.academic.questions.title': 'Questions',
        'admin.academic.questions.addQuestion': 'Add Question',
        'admin.academic.questions.duplicate': 'Duplicate',
        'admin.academic.questions.delete': 'Delete question',
        'admin.academic.questions.editTitle': `Edit question (${opts?.language ?? 'en'})`,
        'admin.academic.questions.untitled': `Question ${opts?.index ?? 1}`,
        'admin.academic.questions.empty': 'No questions yet.',
        'admin.academic.questions.examLanguage': 'Exam language',
        'admin.academic.questions.examLangEn': 'English',
        'admin.academic.questions.examLangZh': 'Chinese',
        'admin.academic.questions.difficulty': 'Difficulty',
        'admin.academic.questions.difficultyFoundation': 'Foundation',
        'admin.academic.questions.difficultyStandard': 'Standard',
        'admin.academic.questions.difficultyAdvanced': 'Advanced',
        'admin.academic.questions.correctOption': 'Correct option',
        'admin.academic.questions.optionLabel': `Option ${opts?.key ?? ''}`,
        'admin.academic.questions.correctMarker': '✓',
        'admin.academic.questions.outlineRefs': 'Outline',
        'admin.academic.questions.objectiveRefs': 'Objectives',
        'admin.academic.questions.stem': 'Stem',
        'admin.academic.questions.options': 'Options',
        'admin.academic.questions.explanations': 'Explanations',
        'admin.academic.questions.explanationContent': 'Explanation content',
        'admin.academic.questions.hints': 'Math hint ladder',
        'admin.academic.questions.addHint': 'Add hint tier',
        'admin.academic.questions.hintStrength': 'Strength',
        'admin.academic.questions.hintStandard': 'Standard',
        'admin.academic.questions.hintStrong': 'Strong (near-solution)',
        'admin.academic.questions.hintContent': 'Hint content',
        'admin.academic.questions.removeHint': 'Remove tier',
        'admin.academic.questions.hintsEmpty': 'No hints yet.',
        'admin.academic.questions.relatedResources': 'Related resources',
        'admin.academic.terms.questionAttachments': 'Optional term attachments',
        'admin.academic.terms.questionAttachmentsHint': 'Optional extras only.',
        'admin.academic.terms.stemPreview': 'Language-help preview on this stem',
        'admin.academic.terms.stemPreviewEmpty': 'No surfaces in this TEXT stem.',
        'admin.academic.terms.stemPreviewMathOnly': 'This stem has no TEXT.',
        'admin.academic.terms.pinnedCue': 'Pinned',
        'admin.academic.terms.presetCue': 'Suggested',
        'admin.academic.terms.empty': 'No terms',
        'admin.academic.terms.untitled': `Untitled term ${opts?.index ?? 1}`,
        'admin.academic.questions.commonMistakeNotes': 'Common mistake notes',
        'admin.academic.questions.commonMistakeEn': 'English note',
        'admin.academic.questions.commonMistakeId': 'Indonesian note',
        'admin.academic.questions.commonMistakeZh': 'Chinese note',
        'admin.academic.objectives.needOutline': 'Need outline',
        'admin.academic.resources.needObjectives': 'Need objectives',
        'admin.academic.blocks.addText': 'Add Text',
        'admin.academic.blocks.addMath': 'Add Formula (LaTeX)',
        'admin.academic.blocks.addImage': 'Add Diagram (Image)',
        'admin.academic.blocks.deleteBlock': 'Delete block',
        'admin.academic.blocks.displayMode': 'Display mode (centered)',
        'admin.academic.blocks.latexSafetyHint': 'Do not use < or >.',
        'admin.academic.provenance.title': 'Provenance',
        'admin.academic.provenance.hint': 'Provenance hint',
        'admin.academic.provenance.origin': 'Origin',
        'admin.academic.localized.tabsAria': 'Content language',
        'admin.academic.localized.langId': 'Indonesian',
        'admin.academic.localized.langEn': 'English',
        'admin.academic.localized.langZh': 'Chinese',
        'admin.academic.localized.shortId': 'ID',
        'admin.academic.localized.shortEn': 'EN',
        'admin.academic.localized.shortZh': 'ZH',
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
    sourcePosition: { page: 1, section: '1' },
    summary: { indonesian: 'Aljabar', english: 'Algebra', simplifiedChinese: '代数' },
  },
];

const objectives: LearningObjective[] = [
  {
    id: 'obj-1',
    title: { indonesian: 'Tujuan', english: 'Objective', simplifiedChinese: '目标' },
    mappings: [{ outlineItemId: 'out-1', rationale: 'covers' }],
  },
];

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1',
    examLanguage: 'en',
    difficulty: 'STANDARD',
    stem: [{ kind: 'TEXT', text: 'Solve x' }],
    options: [
      { key: 'A', blocks: [{ kind: 'TEXT', text: '1' }] },
      { key: 'B', blocks: [{ kind: 'TEXT', text: '2' }] },
      { key: 'C', blocks: [{ kind: 'TEXT', text: '3' }] },
      { key: 'D', blocks: [{ kind: 'TEXT', text: '4' }] },
    ],
    correctOptionKey: 'A',
    explanations: [{ language: 'en', blocks: [{ kind: 'TEXT', text: 'Because' }] }],
    outlineItemIds: ['out-1'],
    objectiveIds: ['obj-1'],
    hintTiers: [
      {
        strength: 'STRONG',
        blocks: [{ kind: 'MATH', latex: '\\text{Hint near solution}', displayMode: true }],
      },
    ],
    provenance: {
      origin: 'YUKCSCA_ORIGINAL',
      authorUserId: '00000000-0000-0000-0000-000000000001',
      reviewedByUserId: null,
      reviewedAt: null,
    },
    ...overrides,
  };
}

describe('QuestionEditor', () => {
  test('keeps hint strength and delete on one compact toolbar row', () => {
    render(
      <QuestionEditor
        questions={[question()]}
        outlineItems={outlineItems}
        objectives={objectives}
        onChange={vi.fn()}
      />,
    );

    const toolbar = document.querySelector('.admin-hint-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar).toContainElement(screen.getByLabelText('Strength'));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Remove tier' }));
    expect(document.querySelector('.admin-hint-card')).not.toBeNull();
    expect(screen.getByLabelText('Strength')).toHaveValue('STRONG');
  });

  test('renders a single full-width add-question action under the list title', () => {
    render(
      <QuestionEditor
        questions={[question()]}
        outlineItems={outlineItems}
        objectives={objectives}
        onChange={vi.fn()}
      />,
    );

    const sidebar = document.querySelector('.admin-split-sidebar');
    const group = sidebar?.querySelector('.admin-equal-actions');
    expect(group).toHaveAttribute('data-count', '1');
    expect(group).toContainElement(screen.getByRole('button', { name: '+ Add Question' }));
  });

  test('adds a hint tier', () => {
    const onChange = vi.fn();
    render(
      <QuestionEditor
        questions={[question({ hintTiers: [] })]}
        outlineItems={outlineItems}
        objectives={objectives}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add hint tier' }));
    const next = onChange.mock.calls[0]?.[0] as Question[];
    expect(next[0]?.hintTiers).toHaveLength(1);
    expect(next[0]?.hintTiers?.[0]?.strength).toBe('STANDARD');
  });

  test('pre-checks suggested stem matches and unchecking removes the underline', () => {
    const requiredTerm = {
      id: 't-req',
      termClass: 'TOPIC_TERM' as const,
      surfaceForms: [{ text: '场强', pinyin: 'chǎng qiáng' }],
      definitions: { indonesian: '', english: 'field', simplifiedChinese: '' },
      englishEquivalent: 'field',
      outlineItemIds: ['out-1'],
    };
    const extra = {
      id: 't-extra',
      termClass: 'TOPIC_TERM' as const,
      surfaceForms: [{ text: '真空', pinyin: 'zhēn kōng' }],
      definitions: { indonesian: '', english: 'vacuum', simplifiedChinese: '' },
      englishEquivalent: 'vacuum',
      outlineItemIds: ['out-1'],
    };
    const instruction = {
      id: 't-ins',
      termClass: 'EXAM_INSTRUCTION' as const,
      surfaceForms: [{ text: '如图', pinyin: 'rú tú' }],
      definitions: { indonesian: '', english: 'as shown', simplifiedChinese: '' },
      englishEquivalent: 'as shown',
      outlineItemIds: [],
    };
    const resources: StudyResource[] = [
      {
        id: 'res-term',
        kind: 'LESSON',
        title: { indonesian: '', english: 'Terms', simplifiedChinese: '' },
        outlineItemIds: ['out-1'],
        objectiveIds: ['obj-1'],
        versions: [],
        requiredTermIds: ['t-req'],
        provenance: {
          origin: 'YUKCSCA_ORIGINAL',
          authorUserId: '00000000-0000-0000-0000-000000000001',
          reviewedByUserId: null,
          reviewedAt: null,
        },
      },
    ];
    const onChange = vi.fn();
    render(
      <QuestionEditor
        questions={[
          question({
            examLanguage: 'zh-CN',
            stem: [{ kind: 'TEXT', text: '如图，真空中场强' }],
          }),
        ]}
        outlineItems={outlineItems}
        objectives={objectives}
        resources={resources}
        terms={[requiredTerm, extra, instruction]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /场强/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /如图/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /真空/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: '场强' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '如图' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '真空' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /如图/ }));
    const next = onChange.mock.calls[0]?.[0] as Question[];
    expect(next[0]?.authoredTermAttachments?.map((row) => row.termId).sort()).toEqual(['t-req']);
  });
});
