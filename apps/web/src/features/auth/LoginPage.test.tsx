import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from './LoginPage';

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    status: 'loading',
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('./GoogleSignInButton', () => ({
  default: () => <div data-testid="google-sign-in">Google</div>,
}));

test('does not initialize Google sign-in while restoring a session', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

  expect(screen.getByText(/memulihkan sesi/i)).toBeInTheDocument();
  expect(screen.queryByTestId('google-sign-in')).not.toBeInTheDocument();
});
