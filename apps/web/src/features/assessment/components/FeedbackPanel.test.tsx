import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import * as profileApi from '@/features/profile/studentProfileApi';
import { FeedbackPanel } from './FeedbackPanel';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.spyOn(profileApi, 'getMyStudentProfile').mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    preferredName: 'Ayu',
    birthYear: 2009,
    currentGrade: 'GRADE_11',
    city: 'Jakarta',
    defaultExplanationLanguage: 'id',
    createdAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('shows one explanation language at a time and lets the student switch', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <FeedbackPanel
          subject="MATHEMATICS"
          interfaceLanguage="en"
          feedback={{
            correct: false,
            correctOptionKey: 'A',
            explanations: [
              { language: 'id', blocks: [{ kind: 'TEXT', text: 'Penjelasan Indonesia' }] },
              { language: 'en', blocks: [{ kind: 'TEXT', text: 'English explanation' }] },
              { language: 'zh-CN', blocks: [{ kind: 'TEXT', text: '中文讲解' }] },
            ],
            commonMistakeNotes: [],
            relatedResources: [],
          }}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  await waitFor(() => {
    expect(screen.getByText('Penjelasan Indonesia')).toBeInTheDocument();
  });
  expect(screen.queryByText('English explanation')).toBeNull();
  expect(screen.queryByText('中文讲解')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /english/i }));
  expect(screen.getByText('English explanation')).toBeInTheDocument();
  expect(screen.queryByText('Penjelasan Indonesia')).toBeNull();
});

test('revalidation feedback distinguishes a hinted correct answer', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <FeedbackPanel
          subject="MATHEMATICS"
          interfaceLanguage="en"
          purpose="REVALIDATION"
          assistanceUsed
          feedback={{
            correct: true,
            correctOptionKey: 'A',
            explanations: [
              { language: 'en', blocks: [{ kind: 'TEXT', text: 'English explanation' }] },
            ],
            commonMistakeNotes: [],
            relatedResources: [],
          }}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

  expect(await screen.findByText(/correct, but a hint was used/i)).toBeInTheDocument();
  expect(screen.getByText(/redo the recheck without a hint/i)).toBeInTheDocument();
});
