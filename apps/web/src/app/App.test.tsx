import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';

vi.mock('@/features/auth/GoogleSignInButton', () => ({
  default: () => <div>Continue with Google</div>,
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    status: 'anonymous',
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

test('redirects an anonymous visitor to login', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: /belajar csca/i })).toBeInTheDocument();
});

test('login page explains the Google authentication boundary', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText(/autentikasi dasar/i)).toBeInTheDocument();
});
