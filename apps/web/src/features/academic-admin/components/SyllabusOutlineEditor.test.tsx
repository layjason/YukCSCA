import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { SyllabusOutlineEditor } from './SyllabusOutlineEditor';
import type { SyllabusOutlineItem } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { index?: number; section?: string; order?: number }) => {
      const map: Record<string, string> = {
        'admin.academic.outline.title': 'Syllabus Outline',
        'admin.academic.outline.subtitle': 'Modules and topics',
        'admin.academic.outline.addModule': 'Add module',
        'admin.academic.outline.addTopic': 'Add topic',
        'admin.academic.outline.empty': 'No outline items yet',
        'admin.academic.outline.emptyDetail': 'Select an item',
        'admin.academic.outline.kindModule': 'Module',
        'admin.academic.outline.kindTopic': 'Topic',
        'admin.academic.outline.kindOrphan': 'Needs parent',
        'admin.academic.outline.yukcscaAuthoredTag': 'YukCSCA-authored',
        'admin.academic.outline.detailHeading': `Section ${opts?.section ?? ''}`,
        'admin.academic.outline.detailFallback': 'Outline detail',
        'admin.academic.outline.remove': 'Remove outline item',
        'admin.academic.outline.removeBlockedHasChildren':
          'Remove or reassign topics under this module first.',
        'admin.academic.outline.needModuleForTopic': 'Add a module before adding a topic.',
        'admin.academic.outline.parentChangeBlocked': 'That parent change is not allowed.',
        'admin.academic.outline.parentLabel': 'Parent module',
        'admin.academic.outline.parentNone': 'None (this is a module)',
        'admin.academic.outline.parentHelp': 'Topics sit under one module.',
        'admin.academic.outline.orphanHint': 'This topic points at a missing parent.',
        'admin.academic.outline.page': 'Page',
        'admin.academic.outline.section': 'Section',
        'admin.academic.outline.summaryId': 'Indonesian Summary (id)',
        'admin.academic.outline.summaryEn': 'English Summary (en)',
        'admin.academic.outline.summaryZh': 'Simplified Chinese Summary (zh-CN)',
        'admin.academic.outline.untitled': `Item ${opts?.index ?? 1}`,
        'admin.academic.outline.untitledModule': `Module ${opts?.order ?? 1}`,
      };
      return map[key] ?? key;
    },
  }),
}));

const baseItems: SyllabusOutlineItem[] = [
  {
    id: 'm1',
    parentId: null,
    order: 0,
    sourcePosition: { page: 1, section: '1' },
    summary: {
      indonesian: 'Modul 1',
      english: 'Module 1',
      simplifiedChinese: '模块 1',
    },
  },
  {
    id: 't1',
    parentId: 'm1',
    order: 0,
    sourcePosition: { page: 2, section: '1.1' },
    summary: {
      indonesian: 'Topik 1',
      english: 'Topic 1',
      simplifiedChinese: '主题 1',
    },
  },
];

describe('SyllabusOutlineEditor', () => {
  test('renders module and topic rows and adds a topic under the selected module', () => {
    const onChange = vi.fn();
    render(<SyllabusOutlineEditor items={baseItems} onChange={onChange} />);

    expect(screen.getAllByText('Module 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Topic 1').length).toBeGreaterThan(0);

    // Default selection is the first module; add topic under it.
    fireEvent.click(screen.getByRole('button', { name: '+ Add topic' }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0] as SyllabusOutlineItem[];
    const created = next.find((item) => item.id !== 'm1' && item.id !== 't1');
    expect(created?.parentId).toBe('m1');
  });

  test('blocks deleting a module that still has topics', () => {
    const onChange = vi.fn();
    render(<SyllabusOutlineEditor items={baseItems} onChange={onChange} />);

    // First row is selected by default (module m1).
    fireEvent.click(screen.getByRole('button', { name: 'Remove outline item' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText('Remove or reassign topics under this module first.'),
    ).toBeInTheDocument();
  });

  test('adds a root module', () => {
    const onChange = vi.fn();
    render(<SyllabusOutlineEditor items={baseItems} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add module' }));
    const next = onChange.mock.calls.at(-1)?.[0] as SyllabusOutlineItem[];
    const created = next.find((item) => item.id !== 'm1' && item.id !== 't1');
    expect(created?.parentId).toBeNull();
  });

  test('shows needModuleForTopic when adding a topic with no modules', () => {
    const onChange = vi.fn();
    render(<SyllabusOutlineEditor items={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add topic' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Add a module before adding a topic.');
  });
});
