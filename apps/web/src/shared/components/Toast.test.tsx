import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'toast.dismiss' ? 'Dismiss' : key),
  }),
}));

describe('Toast', () => {
  it('renders message and dismisses via close control', () => {
    const onDismiss = vi.fn();

    render(<Toast message="Draft saved." tone="success" onDismiss={onDismiss} durationMs={0} />);

    expect(screen.getByRole('status')).toHaveTextContent('Draft saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after durationMs', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<Toast message="Saved." onDismiss={onDismiss} durationMs={2000} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('still auto-dismisses when onDismiss identity changes each render', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Toast message="Saved." onDismiss={() => onDismiss()} durationMs={2000} />,
    );
    rerender(<Toast message="Saved." onDismiss={() => onDismiss()} durationMs={2000} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
