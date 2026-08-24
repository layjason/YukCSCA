import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ScriptEditor } from './ScriptEditor';
import * as api from '../api/academicAdminApi';
import type { RenderJob, SceneSpecification, SceneTemplateRegistry } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { language?: string; index?: number; count?: number }) => {
      const map: Record<string, string> = {
        'admin.academic.video.scriptEditor.title': `Script editor (${opts?.language ?? ''})`,
        'admin.academic.video.scriptEditor.subtitle': 'Author template-based visual segments.',
        'admin.academic.video.scriptEditor.addSegment': 'Add segment',
        'admin.academic.video.scriptEditor.segmentNumber': `Segment ${opts?.index ?? 1}`,
        'admin.academic.video.scriptEditor.actionLabel': 'Visual template action',
        'admin.academic.video.scriptEditor.narrationLabel': 'Narration text',
        'admin.academic.video.scriptEditor.narrationPlaceholder': 'Enter narration text...',
        'admin.academic.video.scriptEditor.mathPlaceholder': 'e.g. x^2',
        'admin.academic.video.scriptEditor.inlineLatexPlaceholder': 'e.g. \\(x^2\\)',
        'content.inlineLatexHint': 'Mix prose with \\(...\\).',
        'admin.academic.blocks.latexSafetyHint': 'Do not use < or >.',
        'admin.academic.blocks.latexAngleBracketWarning': 'Replace < > with \\lt / \\gt.',
        'admin.academic.video.scriptEditor.narrationCharCount': `${opts?.count ?? 0} characters`,
        'admin.academic.video.scriptEditor.moveUp': 'Move up',
        'admin.academic.video.scriptEditor.moveDown': 'Move down',
        'admin.academic.video.scriptEditor.removeSegment': 'Remove segment',
        'admin.academic.video.scriptEditor.emptySegments': 'No segments yet.',
        'admin.academic.video.scriptEditor.saveScript': 'Save script',
        'admin.academic.video.scriptEditor.renderVideo': 'Start rendering',
        'admin.academic.video.scriptEditor.rendering': 'Rendering video...',
        'admin.academic.video.scriptEditor.reRender': 'Re-render video',
        'admin.academic.video.scriptEditor.staleWarning':
          'The script was modified after this render job started.',
        'admin.academic.video.scriptEditor.close': 'Close',
        'admin.academic.video.jobState.QUEUED': 'Queued for rendering',
        'admin.academic.video.jobState.RUNNING': 'Rendering scene...',
        'admin.academic.video.jobState.SUCCEEDED': 'Render succeeded',
        'admin.academic.video.jobState.FAILED': 'Render failed',
        'learn.loading': 'Loading...',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('./KaTeXPreview', () => ({
  KaTeXPreview: ({ latex }: { latex: string }) => <div data-testid="katex-preview">{latex}</div>,
}));

vi.mock('./AdminInlineLatexPreview', () => ({
  AdminInlineLatexPreview: ({ text }: { text: string }) =>
    text.includes('\\(') ? <div data-testid="inline-markup-preview">{text}</div> : null,
}));

const mockRegistry: SceneTemplateRegistry = {
  version: '1',
  actions: [
    {
      id: 'worked_example_step',
      displayName: 'Worked Example Step',
      params: [
        {
          id: 'stepTitle',
          kind: 'STRING',
          label: 'Step title',
          required: true,
          maxLength: 100,
        },
        {
          id: 'mathExpression',
          kind: 'MATH_EXPRESSION',
          label: 'LaTeX formula',
          required: true,
          maxLength: 500,
        },
      ],
    },
  ],
};

describe('ScriptEditor', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(mockRegistry);
  });

  test('loads registry and renders initial segment editor with math preview', async () => {
    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText('Script editor (en)')).toBeInTheDocument();
    expect(screen.getByText('Segment 1')).toBeInTheDocument();
    expect(screen.getByText('Worked Example Step')).toBeInTheDocument();

    const mathInput = screen.getByLabelText(/LaTeX formula/i);
    fireEvent.change(mathInput, { target: { value: 'x^2 + 2x + 1 = 0' } });

    expect(await screen.findByTestId('katex-preview')).toHaveTextContent('x^2 + 2x + 1 = 0');
  });

  test('previews inline latex in prose fields', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue({
      version: '1',
      actions: [
        {
          id: 'statement-text',
          displayName: 'Statement text',
          params: [
            {
              id: 'text',
              kind: 'MULTILINE_TEXT',
              label: 'Statement',
              required: true,
              maxLength: 300,
            },
          ],
        },
      ],
    });

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);
    const statement = await screen.findByLabelText(/Statement/i);
    fireEvent.change(statement, {
      target: { value: 'Vertex at \\(\\frac{-b}{2a}\\).' },
    });

    expect(await screen.findByTestId('inline-markup-preview')).toBeInTheDocument();
    expect(screen.getByTestId('inline-markup-preview')).toHaveTextContent('\\frac{-b}{2a}');
  });

  test('handles adding segment and editing narration text', async () => {
    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Segment 1');

    const addBtn = screen.getByRole('button', { name: /Add segment/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText('Segment 2')).toBeInTheDocument();

    const narrationInputs = screen.getAllByLabelText(/Narration text/i);
    fireEvent.change(narrationInputs[0]!, {
      target: { value: 'First step explanation narration.' },
    });

    expect(narrationInputs[0]).toHaveValue('First step explanation narration.');
  });

  test('saves script and starts render job with polling', async () => {
    const mockSpec: SceneSpecification = {
      id: 'spec-1',
      registryVersion: '1',
      explanationLanguage: 'en',
      segments: [
        {
          templateActionId: 'worked_example_step',
          params: { stepTitle: 'Step 1', mathExpression: 'x=1' },
          narrationText: 'Let x equal 1.',
        },
      ],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockJob: RenderJob = {
      id: 'job-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: 'spec-1',
      videoAssetId: 'vid-prod-1',
      error: null,
    };

    const createSpecSpy = vi.spyOn(api, 'createSceneSpecification').mockResolvedValue(mockSpec);
    const createJobSpy = vi.spyOn(api, 'createRenderJob').mockResolvedValue(mockJob);
    const onSaved = vi.fn();
    const onJobUpdated = vi.fn();
    const onJobEnqueued = vi.fn();

    render(
      <ScriptEditor
        explanationLanguage="en"
        onSaved={onSaved}
        onJobUpdated={onJobUpdated}
        onJobEnqueued={onJobEnqueued}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Segment 1');

    const renderBtn = screen.getByRole('button', { name: /Start rendering/i });
    fireEvent.click(renderBtn);

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalled();
      expect(createJobSpy).toHaveBeenCalledWith('spec-1');
      expect(onSaved).toHaveBeenCalledWith(mockSpec);
      expect(onJobUpdated).toHaveBeenCalledWith(mockJob);
      expect(onJobEnqueued).toHaveBeenCalledTimes(1);
    });
  });
});
