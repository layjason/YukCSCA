import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminNotifyContext } from '../adminNotify';
import { ScriptEditor } from './ScriptEditor';
import * as api from '../api/academicAdminApi';
import type { RenderJob, SceneSpecification, SceneTemplateRegistry } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      opts?: { language?: string; index?: number; count?: number; max?: number },
    ) => {
      const map: Record<string, string> = {
        'admin.academic.video.scriptEditor.title': `Script editor (${opts?.language ?? ''})`,
        'admin.academic.video.scriptEditor.subtitle': 'Author template-based visual segments.',
        'admin.academic.video.scriptEditor.addSegment': 'Add segment',
        'admin.academic.video.scriptEditor.segmentNumber': `Segment ${opts?.index ?? 1}`,
        'admin.academic.video.scriptEditor.actionLabel': 'Visual template action',
        'admin.academic.video.scriptEditor.enumPlaceholder': 'Select an option…',
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
        'admin.academic.video.scriptEditor.scopeNumber': `Scope ${opts?.index ?? 1}`,
        'admin.academic.video.scriptEditor.addScope': 'Add scope',
        'admin.academic.video.scriptEditor.scopesMaxHint': `A union supports at most ${opts?.max ?? 4} scopes.`,
        'admin.academic.video.scriptEditor.removeScope': `Remove scope ${opts?.index ?? 1}`,
        'admin.academic.video.scriptEditor.scopesEmpty': 'No scopes yet.',
        'admin.academic.video.scriptEditor.scopeLeftEndType': 'Left end type',
        'admin.academic.video.scriptEditor.scopeRightEndType': 'Right end type',
        'admin.academic.video.scriptEditor.scopeFinite': 'Finite',
        'admin.academic.video.scriptEditor.scopeInfinite': 'Infinite',
        'admin.academic.video.scriptEditor.scopeLeftEndpoint': 'Left endpoint',
        'admin.academic.video.scriptEditor.scopeRightEndpoint': 'Right endpoint',
        'admin.academic.video.scriptEditor.scopeLeftBoundType': 'Left bound type',
        'admin.academic.video.scriptEditor.scopeRightBoundType': 'Right bound type',
        'admin.academic.video.scriptEditor.scopeOpen': 'Open',
        'admin.academic.video.scriptEditor.scopeClosed': 'Closed',
        'admin.academic.video.scriptEditor.toasts.saved': 'Script saved successfully.',
        'admin.academic.video.scriptEditor.toasts.saveFailed': 'Save script failed',
        'admin.academic.video.scriptEditor.toasts.segmentAdded': 'Segment added.',
        'admin.academic.video.scriptEditor.toasts.segmentRemoved': 'Segment removed.',
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

// Mirrors the reviewed 2026-08.4 registry's function-graph, number-line-interval, and
// number-line-union param descriptors, including their display-only `visibleWhen` rules and the
// INTERVAL_SET composite kind whose member schema is fixed server-side.
const enumRegistry: SceneTemplateRegistry = {
  version: '2026-08.4',
  actions: [
    {
      id: 'function-graph',
      displayName: 'Function graph',
      params: [
        {
          id: 'family',
          kind: 'ENUM',
          label: 'Curve family',
          required: true,
          choices: ['LINEAR', 'QUADRATIC', 'POWER', 'EXP', 'LOG', 'SIN', 'COS'],
        },
        {
          id: 'a',
          kind: 'DECIMAL',
          label: 'Coefficient a',
          required: true,
        },
        {
          id: 'b',
          kind: 'DECIMAL',
          label: 'Coefficient b',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['LINEAR', 'QUADRATIC', 'SIN', 'COS'] },
        },
        {
          id: 'c',
          kind: 'DECIMAL',
          label: 'Coefficient c',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['QUADRATIC', 'SIN', 'COS'] },
        },
        {
          id: 'd',
          kind: 'DECIMAL',
          label: 'Coefficient d',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['SIN', 'COS'] },
        },
        {
          id: 'n',
          kind: 'DECIMAL',
          label: 'Exponent n',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['POWER'] },
        },
        {
          id: 'r',
          kind: 'DECIMAL',
          label: 'Ratio r',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['EXP'] },
        },
        {
          id: 'base',
          kind: 'DECIMAL',
          label: 'Logarithm base',
          required: false,
          visibleWhen: { paramId: 'family', choices: ['LOG'] },
        },
        {
          id: 'xMin',
          kind: 'DECIMAL',
          label: 'X axis minimum',
          required: true,
          min: -100,
          max: 100,
        },
        {
          id: 'xMax',
          kind: 'DECIMAL',
          label: 'X axis maximum',
          required: true,
          min: -100,
          max: 100,
        },
        {
          id: 'keyPoints',
          kind: 'ENUM',
          label: 'Key points',
          required: true,
          choices: ['NONE', 'ROOTS', 'EXTREMA', 'BOTH'],
        },
      ],
    },
    {
      id: 'number-line-interval',
      displayName: 'Number line interval',
      params: [
        {
          id: 'leftInf',
          kind: 'ENUM',
          label: 'Left end type',
          required: true,
          choices: ['FINITE', 'INFINITE'],
        },
        {
          id: 'left',
          kind: 'DECIMAL',
          label: 'Left endpoint',
          required: false,
          min: -100,
          max: 100,
          visibleWhen: { paramId: 'leftInf', choices: ['FINITE'] },
        },
        {
          id: 'leftBound',
          kind: 'ENUM',
          label: 'Left bound type',
          required: false,
          choices: ['OPEN', 'CLOSED'],
          visibleWhen: { paramId: 'leftInf', choices: ['FINITE'] },
        },
        {
          id: 'rightInf',
          kind: 'ENUM',
          label: 'Right end type',
          required: true,
          choices: ['FINITE', 'INFINITE'],
        },
        {
          id: 'right',
          kind: 'DECIMAL',
          label: 'Right endpoint',
          required: false,
          min: -100,
          max: 100,
          visibleWhen: { paramId: 'rightInf', choices: ['FINITE'] },
        },
        {
          id: 'rightBound',
          kind: 'ENUM',
          label: 'Right bound type',
          required: false,
          choices: ['OPEN', 'CLOSED'],
          visibleWhen: { paramId: 'rightInf', choices: ['FINITE'] },
        },
        {
          id: 'setLabel',
          kind: 'MATH_EXPRESSION',
          label: 'Set label',
          required: false,
          maxLength: 80,
        },
      ],
    },
    {
      id: 'number-line-union',
      displayName: 'Number line union',
      params: [
        {
          id: 'scopes',
          kind: 'INTERVAL_SET',
          label: 'Interval scopes',
          required: true,
        },
        {
          id: 'setLabel',
          kind: 'MATH_EXPRESSION',
          label: 'Set label',
          required: false,
          maxLength: 80,
        },
      ],
    },
  ],
};

const defaultMockSpec: SceneSpecification = {
  id: 'spec-1',
  explanationLanguage: 'en',
  registryVersion: '1',
  segments: [],
  latestRenderJob: null,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
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

  test('closes and auto-saves from the header close control', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const createSpecSpy = vi
      .spyOn(api, 'createSceneSpecification')
      .mockResolvedValue(defaultMockSpec);

    render(<ScriptEditor explanationLanguage="en" onSaved={onSaved} onClose={onClose} />);

    await screen.findByText('Segment 1');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledWith(defaultMockSpec);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test('closes and auto-saves when clicking the backdrop overlay', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const createSpecSpy = vi
      .spyOn(api, 'createSceneSpecification')
      .mockResolvedValue(defaultMockSpec);

    render(<ScriptEditor explanationLanguage="en" onSaved={onSaved} onClose={onClose} />);

    await screen.findByText('Segment 1');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledWith(defaultMockSpec);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
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

  test('renders an ENUM parameter as a select of the registry choice tokens', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    const familySelect = await screen.findByLabelText(/Curve family/i);
    expect(familySelect.tagName).toBe('SELECT');

    const optionValues = within(familySelect)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));
    expect(optionValues).toEqual(['', 'LINEAR', 'QUADRATIC', 'POWER', 'EXP', 'LOG', 'SIN', 'COS']);
    expect(within(familySelect).getByText('Select an option…')).toBeInTheDocument();
    expect(screen.getByText('QUADRATIC')).toHaveAttribute('value', 'QUADRATIC');
  });

  test('submits the selected ENUM token in the createSceneSpecification payload', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    const mockSpec: SceneSpecification = {
      id: 'spec-enum-1',
      registryVersion: '2026-08.3',
      explanationLanguage: 'en',
      segments: [
        {
          templateActionId: 'function-graph',
          params: { family: 'QUADRATIC' },
          narrationText: 'A parabola opens upward.',
        },
      ],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockJob: RenderJob = {
      id: 'job-enum-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: 'spec-enum-1',
      videoAssetId: 'vid-enum-1',
      error: null,
    };

    const createSpecSpy = vi.spyOn(api, 'createSceneSpecification').mockResolvedValue(mockSpec);
    vi.spyOn(api, 'createRenderJob').mockResolvedValue(mockJob);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Segment 1');

    fireEvent.change(await screen.findByLabelText(/Curve family/i), {
      target: { value: 'QUADRATIC' },
    });
    fireEvent.change(screen.getByLabelText(/Narration text/i), {
      target: { value: 'A parabola opens upward.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Start rendering/i }));

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalledWith({
        explanationLanguage: 'en',
        segments: [
          {
            templateActionId: 'function-graph',
            params: { family: 'QUADRATIC' },
            narrationText: 'A parabola opens upward.',
          },
        ],
      });
    });
  });

  test('shows only the coefficient inputs applicable to the selected curve family', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Segment 1');

    // Placeholder family: conditional coefficients stay hidden; unconditional
    // coefficient a, axes, and keyPoints inputs are still rendered.
    expect(screen.getByLabelText(/Coefficient a/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Coefficient b/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Exponent n/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/X axis minimum/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/X axis maximum/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Key points/i)).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText(/Curve family/i), {
      target: { value: 'LINEAR' },
    });

    expect(screen.getByLabelText(/Coefficient a/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Coefficient b/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Coefficient c/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Coefficient d/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Exponent n/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ratio r/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Logarithm base/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Key points/i)).toBeInTheDocument();
  });

  test('reveals family-specific coefficients when their choice token is selected', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    const familySelect = await screen.findByLabelText(/Curve family/i);

    fireEvent.change(familySelect, { target: { value: 'POWER' } });
    expect(screen.getByLabelText(/Exponent n/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Coefficient b/i)).not.toBeInTheDocument();

    fireEvent.change(familySelect, { target: { value: 'EXP' } });
    expect(screen.getByLabelText(/Ratio r/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Exponent n/i)).not.toBeInTheDocument();

    fireEvent.change(familySelect, { target: { value: 'LOG' } });
    expect(screen.getByLabelText(/Logarithm base/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ratio r/i)).not.toBeInTheDocument();
  });

  test('removes a now-hidden parameter from the payload when the family changes', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    const mockSpec: SceneSpecification = {
      id: 'spec-visibility-1',
      registryVersion: '2026-08.3',
      explanationLanguage: 'en',
      segments: [
        {
          templateActionId: 'function-graph',
          params: { family: 'LINEAR' },
          narrationText: 'Straight line.',
        },
      ],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockJob: RenderJob = {
      id: 'job-visibility-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: 'spec-visibility-1',
      videoAssetId: 'vid-visibility-1',
      error: null,
    };

    const createSpecSpy = vi.spyOn(api, 'createSceneSpecification').mockResolvedValue(mockSpec);
    vi.spyOn(api, 'createRenderJob').mockResolvedValue(mockJob);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Segment 1');

    const familySelect = await screen.findByLabelText(/Curve family/i);
    fireEvent.change(familySelect, { target: { value: 'POWER' } });
    fireEvent.change(screen.getByLabelText(/Exponent n/i), { target: { value: '3' } });

    fireEvent.change(familySelect, { target: { value: 'LINEAR' } });
    expect(screen.queryByLabelText(/Exponent n/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Narration text/i), {
      target: { value: 'Straight line.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Start rendering/i }));

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalledWith({
        explanationLanguage: 'en',
        segments: [
          {
            templateActionId: 'function-graph',
            params: { family: 'LINEAR' },
            narrationText: 'Straight line.',
          },
        ],
      });
    });
  });

  test('groups interval ends like union scopes and omits infinite-end fields from the payload', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);

    const mockSpec: SceneSpecification = {
      id: 'spec-interval-1',
      registryVersion: '2026-08.4',
      explanationLanguage: 'en',
      segments: [
        {
          templateActionId: 'number-line-interval',
          params: { leftInf: 'INFINITE', rightInf: 'FINITE', right: 0, rightBound: 'CLOSED' },
          narrationText: 'Interval notation.',
        },
      ],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockJob: RenderJob = {
      id: 'job-interval-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: 'spec-interval-1',
      videoAssetId: 'vid-interval-1',
      error: null,
    };

    const createSpecSpy = vi.spyOn(api, 'createSceneSpecification').mockResolvedValue(mockSpec);
    vi.spyOn(api, 'createRenderJob').mockResolvedValue(mockJob);

    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Segment 1');

    fireEvent.change(await screen.findByLabelText(/Visual template action/i), {
      target: { value: 'number-line-interval' },
    });

    // Born complete like a union scope: finite ends expose endpoint + bound type.
    expect(screen.getByLabelText(/Left endpoint/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Left bound type/i)).toHaveValue('CLOSED');
    expect(screen.getByLabelText(/Right endpoint/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Right bound type/i)).toHaveValue('CLOSED');

    const setLabel = screen.getByLabelText('Set label');
    expect(setLabel).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Left end type/i), { target: { value: 'INFINITE' } });
    expect(screen.queryByLabelText(/Left endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Left bound type/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Right bound type/i)).toBeInTheDocument();

    fireEvent.change(setLabel, { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/Narration text/i), {
      target: { value: 'Interval notation.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Start rendering/i }));

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalledWith({
        explanationLanguage: 'en',
        segments: [
          {
            templateActionId: 'number-line-interval',
            params: { leftInf: 'INFINITE', rightInf: 'FINITE', right: 0, rightBound: 'CLOSED' },
            narrationText: 'Interval notation.',
          },
        ],
      });
    });
  });

  /** Opens the editor on the number-line-union action with its INTERVAL_SET scopes param. */
  async function openUnionEditor() {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(enumRegistry);
    render(<ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Segment 1');
    fireEvent.change(screen.getByLabelText(/Visual template action/i), {
      target: { value: 'number-line-union' },
    });
  }

  function unionSpec(): SceneSpecification {
    return {
      id: 'spec-union-1',
      registryVersion: '2026-08.3',
      explanationLanguage: 'en',
      segments: [
        {
          templateActionId: 'number-line-union',
          params: {
            scopes: [{ leftInf: 'INFINITE', rightInf: 'FINITE', right: 0, rightBound: 'CLOSED' }],
          },
          narrationText: 'Union notation.',
        },
      ],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  test('renders INTERVAL_SET scope rows with localized headings and caps the list at four', async () => {
    await openUnionEditor();

    expect(await screen.findByText('No scopes yet.')).toBeInTheDocument();
    expect(screen.queryByText('Scope 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Set label')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add scope/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText('Scope 1')).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/Left end type/i) as HTMLSelectElement).labels?.[0]?.textContent,
    ).toMatch(/\*/);
    // A new row is born complete, never a placeholder.
    expect(screen.getByLabelText(/Left endpoint/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Right endpoint/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Left bound type/i)).toHaveValue('CLOSED');
    expect(screen.getByLabelText(/Right bound type/i)).toHaveValue('CLOSED');

    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    expect(await screen.findByText('Scope 4')).toBeInTheDocument();
    expect(screen.getAllByText(/^Scope \d$/)).toHaveLength(4);
    expect(addBtn).toBeDisabled();
    expect(screen.getByText(/at most 4 scopes/)).toBeInTheDocument();

    // Removing the first row re-labels the remaining rows.
    fireEvent.click(screen.getByRole('button', { name: 'Remove scope 1' }));
    const headings = screen.getAllByText(/^Scope \d$/);
    expect(headings.map((h) => h.textContent)).toEqual(['Scope 1', 'Scope 2', 'Scope 3']);
    expect(addBtn).toBeEnabled();
  });

  test('drops an INFINITE end fields from the createSceneSpecification payload', async () => {
    const mockJob: RenderJob = {
      id: 'job-union-1',
      kind: 'RENDER_SCENE',
      state: 'SUCCEEDED',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sceneSpecificationId: 'spec-union-1',
      videoAssetId: 'vid-union-1',
      error: null,
    };

    const createSpecSpy = vi.spyOn(api, 'createSceneSpecification').mockResolvedValue(unionSpec());
    vi.spyOn(api, 'createRenderJob').mockResolvedValue(mockJob);

    await openUnionEditor();
    fireEvent.click(screen.getByRole('button', { name: /Add scope/i }));
    await screen.findByText('Scope 1');

    fireEvent.change(screen.getByLabelText(/Left end type/i), { target: { value: 'INFINITE' } });
    expect(screen.queryByLabelText(/Left endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Left bound type/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Right endpoint/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Narration text/i), {
      target: { value: 'Union notation.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Start rendering/i }));

    await waitFor(() => {
      expect(createSpecSpy).toHaveBeenCalledWith({
        explanationLanguage: 'en',
        segments: [
          {
            templateActionId: 'number-line-union',
            params: {
              scopes: [{ leftInf: 'INFINITE', rightInf: 'FINITE', right: 0, rightBound: 'CLOSED' }],
            },
            narrationText: 'Union notation.',
          },
        ],
      });
    });
  });

  test('maps array-level INTERVAL_SET violations onto the scopes editor', async () => {
    vi.spyOn(api, 'createSceneSpecification').mockRejectedValue(
      new api.ApiError(400, {
        status: 400,
        title: 'Validation failed',
        code: 'ACADEMIC_VALIDATION_FAILED',
        violations: [{ path: 'segments[0].params.scopes', code: 'OUT_OF_RANGE' }],
      }),
    );

    await openUnionEditor();
    fireEvent.click(screen.getByRole('button', { name: /Save script/i }));

    expect(await screen.findByText('OUT_OF_RANGE (segments[0].params.scopes)')).toBeInTheDocument();
  });

  test('maps scope violations onto their row and keeps other segment violations at segment level', async () => {
    vi.spyOn(api, 'createSceneSpecification').mockRejectedValue(
      new api.ApiError(400, {
        status: 400,
        title: 'Validation failed',
        code: 'ACADEMIC_VALIDATION_FAILED',
        violations: [
          { path: 'segments[0].params.scopes[0].leftBound', code: 'REQUIRED' },
          { path: 'segments[0].narrationText', code: 'REQUIRED' },
        ],
      }),
    );

    await openUnionEditor();
    fireEvent.click(screen.getByRole('button', { name: /Add scope/i }));
    await screen.findByText('Scope 1');

    fireEvent.click(screen.getByRole('button', { name: /Save script/i }));

    await screen.findByText('REQUIRED (segments[0].params.scopes[0].leftBound)');

    const row = screen.getByText('Scope 1').closest('.admin-scope-card');
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByText('REQUIRED (segments[0].params.scopes[0].leftBound)'),
    ).toBeInTheDocument();

    // The narration violation stays in the segment-level area, exactly once each.
    expect(screen.getAllByText('REQUIRED (segments[0].narrationText)')).toHaveLength(1);
    expect(screen.getAllByText('REQUIRED (segments[0].params.scopes[0].leftBound)')).toHaveLength(
      1,
    );
  });

  test('acknowledges a saved script with a success toast', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(mockRegistry);
    vi.spyOn(api, 'createSceneSpecification').mockResolvedValue({
      id: 'spec-toast-1',
      registryVersion: '1',
      explanationLanguage: 'en',
      segments: [],
      latestRenderJob: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const notify = vi.fn();
    render(
      <AdminNotifyContext.Provider value={notify}>
        <ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </AdminNotifyContext.Provider>,
    );

    await screen.findByText('Segment 1');
    fireEvent.click(screen.getByRole('button', { name: /Save script/i }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Script saved successfully.', 'success');
    });
  });

  test('shows a failure toast while keeping inline violations on a rejected save', async () => {
    vi.spyOn(api, 'listSceneTemplates').mockResolvedValue(mockRegistry);
    vi.spyOn(api, 'createSceneSpecification').mockRejectedValue(
      new api.ApiError(400, {
        status: 400,
        title: 'Validation failed',
        code: 'ACADEMIC_VALIDATION_FAILED',
        violations: [{ path: 'segments[0].narrationText', code: 'REQUIRED' }],
      }),
    );
    const notify = vi.fn();
    render(
      <AdminNotifyContext.Provider value={notify}>
        <ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </AdminNotifyContext.Provider>,
    );

    await screen.findByText('Segment 1');
    fireEvent.click(screen.getByRole('button', { name: /Save script/i }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Save script failed', 'error');
    });
    expect(await screen.findByText('REQUIRED (segments[0].narrationText)')).toBeInTheDocument();
  });

  test('acknowledges adding and removing a segment with toasts', async () => {
    const notify = vi.fn();
    render(
      <AdminNotifyContext.Provider value={notify}>
        <ScriptEditor explanationLanguage="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </AdminNotifyContext.Provider>,
    );

    await screen.findByText('Segment 1');
    fireEvent.click(screen.getByRole('button', { name: /Add segment/i }));
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Segment added.', 'success');
    });

    const removeButtons = screen.getAllByRole('button', { name: 'Remove segment' });
    fireEvent.click(removeButtons[removeButtons.length - 1]!);
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Segment removed.', 'error');
    });
  });
});
