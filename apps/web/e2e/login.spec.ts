import { expect, test } from '@playwright/test';

test('shows the preview credential form and production Google entry point', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  );
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /masuk|sign in/i })).toBeVisible();
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
  await expect(page.getByLabel(/kata sandi|password/i).first()).toBeVisible();
  await expect(page.getByText(/production|produksi/i)).toBeVisible();
});
