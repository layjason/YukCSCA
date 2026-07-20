import { expect, test } from '@playwright/test';

test('shows the Google login entry point', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  );
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /belajar csca/i })).toBeVisible();
  await expect(page.getByText(/autentikasi dasar/i)).toBeVisible();
});
