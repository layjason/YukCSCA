import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AppShellLayout } from './AppShellLayout';
import { ConsumerProvider } from '@/prototype/consumer/state/ConsumerProvider';
import { DESKTOP_NAV_EXPANDED_KEY } from './useDesktopNavExpanded';

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'u1',
      displayName: 'Google Name',
      role: 'STUDENT',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/profile/studentProfileApi', () => ({
  getMyStudentProfile: vi.fn().mockResolvedValue({
    preferredName: 'Ayu Maya',
  }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/app/learn']}>
      <ConsumerProvider>
        <Routes>
          <Route element={<AppShellLayout />}>
            <Route path="/app/learn" element={<p>Learn body</p>} />
          </Route>
        </Routes>
      </ConsumerProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.removeItem(DESKTOP_NAV_EXPANDED_KEY);
});

function desktopNav(): HTMLElement {
  const nav = document.querySelector('.app-nav');
  if (!(nav instanceof HTMLElement)) {
    throw new Error('desktop sidebar not rendered');
  }
  return nav;
}

test('pins preferred name and sign-out in the expanded desktop sidebar', async () => {
  renderShell();
  const nav = desktopNav();
  expect(nav).toHaveClass('app-nav-expanded');
  expect(nav.querySelector('.app-nav-footer')).not.toBeNull();
  expect(await screen.findByText('Ayu Maya')).toBeInTheDocument();
  expect(screen.queryByText('Google Name')).not.toBeInTheDocument();
  expect(screen.queryByText(/^(Student|Siswa)$/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /keluar|sign out/i })).toBeInTheDocument();
});

test('collapses the desktop sidebar and can keep it open again', async () => {
  renderShell();
  await screen.findByText('Ayu Maya');
  fireEvent.click(screen.getByRole('button', { name: /ciutkan|collapse/i }));
  const nav = desktopNav();
  expect(nav).toHaveClass('app-nav-collapsed');
  expect(window.localStorage.getItem(DESKTOP_NAV_EXPANDED_KEY)).toBe('0');
  expect(screen.queryByRole('button', { name: /keluar|sign out/i })).not.toBeInTheDocument();
  expect(nav.querySelector('.app-nav-footer .app-nav-toggle')).not.toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /tetap buka|keep sidebar/i }));
  expect(nav).toHaveClass('app-nav-expanded');
  expect(screen.getByRole('button', { name: /keluar|sign out/i })).toBeInTheDocument();
});
