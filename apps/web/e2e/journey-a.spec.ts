import { test, expect, type Page } from '@playwright/test';

async function mockAuthAsStudent(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
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

test.describe('Journey A: Goal to remediation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAsStudent(page);
  });

  test('completes goals → subjects → diagnostic → plan → Today → lesson → practice → mistake → progress', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding\/student\/goals/);

    // Goals: fill and submit
    await page.getByLabel(/target enrollment year|tahun masuk/i).fill('2027');
    await page.getByLabel(/target exam date|tanggal ujian/i).fill('2027-03-15');
    await page.getByLabel(/target major|jurusan/i).fill('Computer Science');
    await page.getByRole('button', { name: /continue to subjects|lanjut ke mata/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/student\/subjects/);

    // Subjects: confirm
    await page.getByRole('button', { name: /confirm and start|konfirmasi/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/student\/diagnostic/);

    // Diagnostic: answer 3 questions
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio').first().check();
      const nextBtn = page.getByRole('button', {
        name: /next|berikutnya|submit|kirim/i,
      });
      await nextBtn.click();
    }
    await expect(page).toHaveURL(/\/onboarding\/student\/diagnostic\/result/);

    // Result: continue to plan
    await page.getByRole('button', { name: /view your study plan|lihat rencana/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/student\/plan-review/);

    // Plan: confirm
    await page.getByRole('button', { name: /confirm plan|konfirmasi rencana/i }).click();
    await expect(page).toHaveURL(/\/app\/today/);

    // Today: click continue learning
    await page.getByRole('link', { name: /continue learning|lanjutkan belajar/i }).click();
    await expect(page).toHaveURL(/\/app\/learn\/lesson-factorisation-1/);

    // Lesson: pass checkpoint
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /submit|kirim/i }).click();

    // Navigate to assigned practice
    await page.getByRole('link', { name: /start assigned practice|mulai latihan/i }).click();
    await expect(page).toHaveURL(/\/app\/practice\/practice-factorisation-1/);

    // Practice: select wrong answer (second option) and navigate through
    await page.getByRole('heading', { name: /sesi latihan|practice session/i }).waitFor();
    await page.getByRole('radio').nth(1).check();
    await page.getByRole('button', { name: /next|berikutnya/i }).click();

    // Answer remaining questions
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio').first().check();
      const btn = page.getByRole('button', {
        name: /next|berikutnya|submit|kirim/i,
      });
      await btn.click();
    }
    await expect(page).toHaveURL(/\/app\/practice\/practice-factorisation-1\/result/);

    // Result: view mistake
    const mistakeLink = page.getByRole('link', { name: /view mistake|lihat detail/i });
    await expect(mistakeLink).toBeVisible();
    await mistakeLink.click();
    await expect(page).toHaveURL(/\/app\/practice\/mistakes\//);

    // Complete remediation
    const remediationBtn = page.getByRole('button', {
      name: /mark remediation complete|tandai perbaikan/i,
    });
    await expect(remediationBtn).toBeVisible();
    await remediationBtn.click();
    await expect(page.getByText(/review completed|tinjauan selesai/i)).toBeVisible();

    // Navigate to progress
    await page.getByRole('link', { name: /view progress|lihat kemajuan/i }).click();
    await expect(page).toHaveURL(/\/app\/progress/);
    await expect(page.getByText(/1 dari 2 perbaikan|1 of 2 remediations/i)).toBeVisible();
  });
});
