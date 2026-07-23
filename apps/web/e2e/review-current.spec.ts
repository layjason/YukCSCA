import { expect, test, type Page } from '@playwright/test';

async function mockAuthAsStudent(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'review-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'student@example.com',
          displayName: 'Ayu',
          avatarUrl: null,
          role: 'STUDENT',
          onboardingCompleted: true,
        },
      }),
    }),
  );
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

test('captures the repaired PX-001 baseline at required review widths', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one viewport-controlled evidence run is enough');
  await mockAuthAsStudent(page);
  await completeOnboarding(page);

  const reviewTargets = [
    { name: 'desktop-today', width: 1440, height: 1000, path: '/app/today' },
    { name: 'desktop-learn', width: 1440, height: 1000, path: '/app/learn' },
    { name: 'desktop-mock', width: 1440, height: 1000, path: '/app/mock-exams' },
    { name: 'tablet-practice', width: 768, height: 1024, path: '/app/practice' },
    { name: 'tablet-progress', width: 768, height: 1024, path: '/app/progress' },
    { name: 'mobile-today', width: 360, height: 800, path: '/app/today' },
    { name: 'mobile-learn', width: 360, height: 800, path: '/app/learn' },
    { name: 'mobile-more', width: 360, height: 800, path: '/app/more' },
  ];

  for (const target of reviewTargets) {
    await page.setViewportSize({ width: target.width, height: target.height });
    await navigateWithinPreview(page, target.path);
    await expect(page.locator('main h1')).toBeVisible();
    await page.locator('.page-content').evaluate(async (element) => {
      await Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    const viewportDoesNotOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(viewportDoesNotOverflow).toBe(true);

    if (target.width === 360) {
      const mobileLabels = await page
        .locator('.app-bottom-nav .bottom-nav-label')
        .allTextContents();
      expect(mobileLabels).toEqual(['Hari Ini', 'Belajar', 'Latihan', 'Kemajuan', 'Lainnya']);
    }

    await page.screenshot({
      path: testInfo.outputPath(`${target.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }

  await page.setViewportSize({ width: 360, height: 800 });
  for (const language of ['id', 'en', 'zh-CN']) {
    await navigateWithinPreview(page, '/app/profile/languages');
    await page.locator('.settings-section select').selectOption(language);
    await navigateWithinPreview(page, '/app/learn/lesson-factorisation-1');
    await expect(page.locator('main h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`mobile-lesson-${language}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }
});

test('keeps keyboard focus visible and removes purposeful animation under reduced motion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'viewport-controlled accessibility check');
  await mockAuthAsStudent(page);
  await completeOnboarding(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('link', { name: /more|lainnya/i }).click();
  await expect(page).toHaveURL(/\/app\/more/);

  await expect(page.getByRole('heading', { name: /more|lainnya/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: /representative preview exam|ujian contoh/i }),
  ).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await navigateWithinPreview(page, '/app/today');
  const transitionDuration = await page
    .locator('.btn-primary')
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
});
