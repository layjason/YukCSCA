import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '@/shared/i18n';
import * as terminologyApi from '@/shared/api/terminologyStudentApi';
import * as profileApi from '@/features/profile/studentProfileApi';
import { TerminologyNotebookPage } from './TerminologyNotebookPage';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Jia',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: 'en',
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('empty notebook is a valid success state', async () => {
  vi.spyOn(terminologyApi, 'listTerminologyNotebook').mockResolvedValue({
    items: [],
    nextCursor: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TerminologyNotebookPage />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/no terms collected yet/i)).toBeInTheDocument();
});

test('dueOnly query shows the empty-due success state after a remount', async () => {
  const list = vi.spyOn(terminologyApi, 'listTerminologyNotebook').mockResolvedValue({
    items: [],
    nextCursor: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/app/learn/terms?dueOnly=1']}>
        <TerminologyNotebookPage />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/you’re caught up|you're caught up/i)).toBeInTheDocument();
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({
      dueOnly: true,
      explanationLanguage: 'en',
    }),
  );
});
