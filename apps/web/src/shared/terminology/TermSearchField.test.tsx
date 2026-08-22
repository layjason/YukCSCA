import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import { TermSearchField } from './TermSearchField';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

test('clears the query from the trailing control', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <TermSearchField value="导" onChange={onChange} />
    </I18nextProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
  expect(onChange).toHaveBeenCalledWith('');
});
