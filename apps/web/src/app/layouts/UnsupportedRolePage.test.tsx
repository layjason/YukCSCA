import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { UnsupportedRolePage } from './UnsupportedRolePage';

const logout = vi.fn();
const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', role: 'STUDENT', displayName: 'Student' },
    logout,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { role?: string }) => {
      const map: Record<string, string> = {
        'unsupported.eyebrow': 'Access',
        'unsupported.title': 'You can’t open this page',
        'unsupported.description': `Your account (${opts?.role ?? ''}) doesn’t have access to this area.`,
        'unsupported.unknownRole': 'current role',
        'unsupported.continue': 'Continue',
        'unsupported.signOut': 'Sign out',
        'unsupported.signingOut': 'Signing out…',
        'roles.STUDENT': 'Student',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('UnsupportedRolePage', () => {
  beforeEach(() => {
    logout.mockReset();
    navigate.mockReset();
    logout.mockResolvedValue(undefined);
  });

  test('offers continue home for the current role', () => {
    render(
      <MemoryRouter>
        <UnsupportedRolePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('You can’t open this page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(navigate).toHaveBeenCalledWith('/app/profile', { replace: true });
  });

  test('signs out and redirects to login', async () => {
    render(
      <MemoryRouter>
        <UnsupportedRolePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
