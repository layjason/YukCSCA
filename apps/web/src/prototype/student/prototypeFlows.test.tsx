import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/app/App';
import { mobileMoreRoutes, mobilePrimaryNavRoutes } from '@/app/routes';
import { PrototypeProvider, type ScenarioId } from './PrototypeProvider';
import type { PrototypeState } from './prototypeState';
import { ConsumerProvider } from '@/prototype/consumer/state/ConsumerProvider';

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: useAuthMock,
}));

const student = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@example.com',
  displayName: 'Ayu',
  avatarUrl: null,
  role: 'STUDENT' as const,
  onboardingCompleted: true,
};

function renderScenario(
  route: string,
  scenario: ScenarioId,
  initialOverrides?: Partial<PrototypeState>,
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <PrototypeProvider
        initialScenario={scenario}
        {...(initialOverrides ? { initialOverrides } : {})}
      >
        <ConsumerProvider>
          <App />
        </ConsumerProvider>
      </PrototypeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthMock.mockReturnValue({
    status: 'authenticated',
    user: student,
    login: vi.fn(),
    logout: vi.fn(),
    replaceCurrentUser: vi.fn(),
  });
});

describe('PX-001 integrated preview states', () => {
  test('keeps Progress in primary mobile navigation and groups secondary destinations under More', () => {
    expect(mobilePrimaryNavRoutes.map((route) => route.id)).toEqual([
      'today',
      'learn',
      'practice',
      'progress',
      'more',
    ]);
    expect(mobileMoreRoutes.map((route) => route.id)).toEqual([
      'mock-exams',
      'profile',
      'profile-languages',
      'profile-family',
      'profile-access',
    ]);
  });

  test('shows recoverable loading and error states without fabricating content', () => {
    const loading = renderScenario('/app/today', 'loading');
    expect(screen.getByRole('status')).toHaveTextContent(/menyiapkan konten pratinjau/i);
    loading.unmount();

    renderScenario('/app/today', 'recoverable-error');
    expect(screen.getByRole('alert')).toHaveTextContent(/terjadi kesalahan/i);
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(screen.getByRole('heading', { name: /hari ini/i })).toBeInTheDocument();
  });

  test('preserves goal input on validation failure', () => {
    renderScenario('/onboarding/student/goals', 'new-student');
    fireEvent.change(screen.getByLabelText(/jurusan atau bidang target/i), {
      target: { value: 'Computer Science' },
    });
    fireEvent.click(screen.getByRole('button', { name: /lanjut ke mata pelajaran/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/wajib diisi/i);
    expect(screen.getByLabelText(/tahun masuk target/i)).toHaveValue('2027');
    expect(screen.getByLabelText(/jurusan atau bidang target/i)).toHaveValue('Computer Science');
  });

  test('requires explicit acknowledgement before excluding a required sample subject', () => {
    renderScenario('/onboarding/student/subjects', 'new-student', {
      onboardingStep: 'subjects',
    });

    const subjectChoices = screen.getAllByLabelText(/sertakan mata pelajaran ini/i);
    const requiredSubject = subjectChoices[0];
    const alternativeSubject = subjectChoices[1];
    if (!requiredSubject || !alternativeSubject) {
      throw new Error('Expected both sample subject choices');
    }
    fireEvent.click(alternativeSubject);
    fireEvent.click(requiredSubject);

    const continueButton = screen.getByRole('button', {
      name: /konfirmasi dan mulai diagnostik/i,
    });
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/rencana persiapan.*tidak lengkap/i));
    expect(continueButton).toBeEnabled();
  });

  test('derives diagnostic strengths and gaps from the submitted answers', () => {
    renderScenario('/onboarding/student/diagnostic/result', 'new-student', {
      onboardingStep: 'result',
      diagnosticSubmitted: true,
      diagnosticAnswers: { 'diag-1': 0, 'diag-2': 0, 'diag-3': 0 },
    });

    const strengths = screen.getByRole('heading', { name: /kekuatan/i }).closest('section');
    const gaps = screen
      .getByRole('heading', { name: /area yang perlu dikembangkan/i })
      .closest('section');
    expect(strengths?.querySelectorAll('li')).toHaveLength(3);
    expect(gaps?.querySelectorAll('li')).toHaveLength(0);
    expect(screen.getByText(/belum cukup untuk menetapkan penguasaan/i)).toBeInTheDocument();
  });

  test('preserves practice answers across a recoverable submit failure and succeeds on retry', async () => {
    renderScenario('/app/practice/practice-factorisation-1', 'practice-submit-error');

    for (let questionIndex = 0; questionIndex < 4; questionIndex += 1) {
      const radios = screen.getAllByRole('radio');
      const answer = radios[questionIndex === 0 ? 1 : 0];
      if (!answer) throw new Error('Expected a practice answer option');
      fireEvent.click(answer);
      fireEvent.click(
        screen.getByRole('button', {
          name: questionIndex === 3 ? /kirim jawaban/i : /berikutnya/i,
        }),
      );
    }

    expect(await screen.findByRole('alert')).toHaveTextContent(/jawaban.*tetap/i);
    expect(screen.getAllByRole('radio')[0]).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /hasil latihan/i })).toBeInTheDocument(),
    );
    expect(screen.getByText(/3 dari 4/i)).toBeInTheDocument();
  });

  test('resumes an interrupted mock with the current answer and requires priority approval', () => {
    renderScenario('/app/mock-exams/mock-math-en-1/session', 'mock-in-progress');
    expect(screen.getByRole('heading', { name: /ujian pratinjau terganggu/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan ujian/i }));
    expect(screen.getAllByRole('radio')[0]).toBeChecked();
  });

  test('keeps a completed mock recommendation pending until the student approves it', () => {
    renderScenario('/app/mock-exams/mock-math-en-1/result', 'mock-completed');
    expect(screen.getByText(/menunggu persetujuan/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /setujui perubahan/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/disetujui/i);
  });
});
