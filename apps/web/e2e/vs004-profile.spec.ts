import { expect, test, type Page } from '@playwright/test';

async function mockAuthAsStudent(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'vs004-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'student@example.com',
          displayName: 'Ayu Student',
          avatarUrl: null,
          role: 'STUDENT',
          onboardingCompleted: true,
        },
      }),
    }),
  );

  await page.route('**/api/v1/student-profile/me', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000002',
          preferredName: 'Ayu',
          birthYear: 2009,
          currentGrade: 'GRADE_11',
          city: 'Jakarta',
          defaultExplanationLanguage: 'id',
          createdAt: '2026-07-22T00:00:00Z',
          updatedAt: '2026-07-22T00:00:00Z',
        }),
      });
    }

    if (route.request().method() === 'PATCH') {
      const payload = JSON.parse(route.request().postData() ?? '{}');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000002',
          preferredName: payload.preferredName ?? 'Ayu',
          birthYear: payload.birthYear ?? 2009,
          currentGrade: payload.currentGrade ?? 'GRADE_11',
          city: payload.city ?? 'Jakarta',
          defaultExplanationLanguage: payload.defaultExplanationLanguage ?? 'id',
          createdAt: '2026-07-22T00:00:00Z',
          updatedAt: '2026-07-31T00:00:00Z',
        }),
      });
    }
  });
}

async function completeOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel(/target enrollment year|tahun masuk/i).fill('2027');
  await page.getByLabel(/target exam date|tanggal ujian/i).fill('2027-03-15');
  await page.getByLabel(/target major|jurusan/i).fill('Computer Science');
  await page.getByRole('button', { name: /continue to subjects|lanjut/i }).click();
  await page.getByRole('button', { name: /confirm and start|konfirmasi/i }).click();

  for (let index = 0; index < 3; index += 1) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /next|berikutnya|submit|kirim/i }).click();
  }

  await page.getByRole('button', { name: /view your study plan|lihat rencana/i }).click();
  await page.getByRole('button', { name: /confirm plan|konfirmasi rencana/i }).click();
  await expect(page).toHaveURL(/\/app\/today/);
}

async function navigateWithinPreview(page: Page, path: string): Promise<void> {
  await page.evaluate((destination) => {
    window.history.pushState({}, '', destination);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('VS-004: Student Profile & Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAsStudent(page);
    await completeOnboarding(page);
  });

  test('views and updates student profile on desktop and mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one viewport-controlled run');

    // Desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await navigateWithinPreview(page, '/app/profile');

    await expect(
      page.getByRole('heading', { name: /identitas akun|account identity/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/nama panggilan|preferred name/i)).toHaveValue('Ayu');

    // Edit profile field
    await page.getByLabel(/nama panggilan|preferred name/i).fill('Ayu Kartika');
    await page.getByRole('button', { name: /simpan profil|save profile/i }).click();

    await expect(
      page.getByText(/profil berhasil diperbarui|profile updated successfully/i),
    ).toBeVisible();

    await page.screenshot({
      path: `output/playwright/VS-004/desktop-profile.png`,
      fullPage: true,
    });

    // Mobile viewport
    await page.setViewportSize({ width: 360, height: 800 });
    await navigateWithinPreview(page, '/app/profile');
    await expect(page.getByLabel(/nama panggilan|preferred name/i)).toHaveValue('Ayu Kartika');

    await page.screenshot({
      path: `output/playwright/VS-004/mobile-profile.png`,
      fullPage: true,
    });
  });

  test('manages language settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one viewport-controlled run');

    await page.setViewportSize({ width: 1440, height: 900 });
    await navigateWithinPreview(page, '/app/profile/languages');

    await expect(
      page.getByRole('heading', { name: /pengaturan bahasa|language settings/i }),
    ).toBeVisible();

    // Select default explanation language
    const langSelect = page.getByLabel(/bahasa penjelasan utama|default explanation language/i);
    await langSelect.selectOption('en');

    await page.getByRole('button', { name: /simpan bahasa|save explanation language/i }).click();
    await expect(page.getByText(/berhasil disimpan|updated successfully/i)).toBeVisible();

    await page.screenshot({
      path: `output/playwright/VS-004/desktop-languages.png`,
      fullPage: true,
    });
  });
});
