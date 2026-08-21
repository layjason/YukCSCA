import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { MixedProse } from './MixedProse';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.useRealTimers();
});

test('renders inline KaTeX inside prose', () => {
  const source = 'If \\(x^2\\) is positive.';
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse text={source} as="p" />
    </I18nextProvider>,
  );

  expect(screen.getByText(/If/)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /x\^2/i })).toBeInTheDocument();
  expect(screen.getByText(/is positive/)).toBeInTheDocument();
});

test('keeps term chips out of latex ranges', async () => {
  const onActivate = vi.fn();
  const source = '求 \\(x^2\\) 公因式';
  const chipStart = source.indexOf('公因式');
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse
        text={source}
        as="p"
        spans={[
          { termId: 't1', surfaceForm: '公因式', startOffset: chipStart, endOffset: chipStart + 3 },
        ]}
        onActivate={onActivate}
      />
    </I18nextProvider>,
  );

  const chip = screen.getByRole('button', { name: '公因式' });
  chip.click();
  expect(onActivate).toHaveBeenCalledWith(
    expect.objectContaining({ termId: 't1', surfaceForm: '公因式' }),
    expect.any(HTMLElement),
  );
  expect(screen.queryByRole('button', { name: /x\^2/i })).not.toBeInTheDocument();
  expect(chip).toHaveAttribute('lang', 'zh');
});

test('mouse hover activates a term chip after the delay', () => {
  vi.useFakeTimers();
  const onActivate = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse
        text="场强"
        as="p"
        spans={[{ termId: 't1', surfaceForm: '场强', startOffset: 0, endOffset: 2 }]}
        onActivate={onActivate}
      />
    </I18nextProvider>,
  );

  const chip = screen.getByRole('button', { name: '场强' });
  fireEvent.pointerEnter(chip, { pointerType: 'mouse' });
  vi.advanceTimersByTime(399);
  expect(onActivate).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(onActivate).toHaveBeenCalledTimes(1);

  fireEvent.pointerEnter(chip, { pointerType: 'mouse' });
  fireEvent.pointerDown(chip);
  fireEvent.click(chip);
  vi.advanceTimersByTime(400);
  expect(onActivate).toHaveBeenCalledTimes(2);
});

test('clicking during the hover delay activates once', () => {
  vi.useFakeTimers();
  const onActivate = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse
        text="场强"
        as="p"
        spans={[{ termId: 't1', surfaceForm: '场强', startOffset: 0, endOffset: 2 }]}
        onActivate={onActivate}
      />
    </I18nextProvider>,
  );

  const chip = screen.getByRole('button', { name: '场强' });
  fireEvent.pointerEnter(chip, { pointerType: 'mouse' });
  fireEvent.pointerDown(chip);
  fireEvent.click(chip);
  vi.advanceTimersByTime(400);
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('touch pointer does not hover-activate a term chip', () => {
  vi.useFakeTimers();
  const onActivate = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse
        text="场强"
        as="p"
        spans={[{ termId: 't1', surfaceForm: '场强', startOffset: 0, endOffset: 2 }]}
        onActivate={onActivate}
      />
    </I18nextProvider>,
  );

  fireEvent.pointerEnter(screen.getByRole('button', { name: '场强' }), { pointerType: 'touch' });
  vi.advanceTimersByTime(400);
  expect(onActivate).not.toHaveBeenCalled();
});

test('unmatched delimiters show an explicit error', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse text="broken \\(x^2" as="p" />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert')).toHaveTextContent(/unmatched/i);
});

test('does not render unsafe inline latex as HTML', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MixedProse text="bad \\(\\href{https://x}{x}\\) here" as="p" />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert')).toHaveTextContent(/could not be displayed/i);
  expect(document.querySelector('a')).toBeNull();
});
