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

test.describe('Journey B: Representative mock exam', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAsStudent(page);
  });

  test('recovers an interrupted attempt, submits once, and requires approval before changing the plan', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel(/target enrollment year|tahun masuk/i).fill('2027');
    await page.getByLabel(/target exam date|tanggal ujian/i).fill('2027-03-15');
    await page.getByLabel(/target major|jurusan/i).fill('Computer Science');
    await page.getByRole('button', { name: /continue to subjects|lanjut/i }).click();
    await page.getByRole('button', { name: /confirm and start|konfirmasi/i }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio').first().check();
      await page.getByRole('button', { name: /next|berikutnya|submit|kirim/i }).click();
    }
    await page.getByRole('button', { name: /view your study plan|lihat rencana/i }).click();
    await page.getByRole('button', { name: /confirm plan|konfirmasi rencana/i }).click();
    await expect(page).toHaveURL(/\/app\/today/);

    if ((page.viewportSize()?.width ?? 0) < 960) {
      await page.getByRole('link', { name: /more|lainnya/i }).click();
      await page.getByRole('link', { name: /mock exam|ujian coba/i }).click();
    } else {
      await page.getByRole('link', { name: /mock exam|ujian coba/i }).click();
    }

    await expect(page).toHaveURL(/\/app\/mock-exams/);

    // Select the sample exam
    await page.getByRole('link', { name: /start exam|mulai ujian/i }).click();
    await expect(page).toHaveURL(/\/app\/mock-exams\/.*\/instructions/);

    // Accept instructions
    await page.getByRole('button', { name: /I understand|saya mengerti/i }).click();
    await expect(page).toHaveURL(/\/app\/mock-exams\/.*\/session/);

    // Answer first question
    await page.getByRole('radio').first().check();

    // Mark for review
    await page.getByRole('button', { name: /mark for review|tandai/i }).click();

    // Exercise interruption recovery and prove the first answer remains selected.
    await page.getByRole('button', { name: /simulate interruption|simulasikan gangguan/i }).click();
    await expect(page.getByRole('heading', { name: /interrupted|terganggu/i })).toBeVisible();
    await page.getByRole('button', { name: /resume preview exam|lanjutkan ujian/i }).click();
    await expect(page.getByRole('radio').first()).toBeChecked();
    await expect(page.locator('button[aria-pressed="true"]')).toBeVisible();

    // Navigate to next question
    await page.getByRole('button', { name: /next|berikutnya/i }).click();

    // Answer second question
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /next|berikutnya/i }).click();

    // Answer third question incorrectly and submit
    await page.getByRole('radio').nth(1).check();
    await page.getByRole('button', { name: /submit exam|kirim ujian/i }).click();

    // Confirm submission in dialog
    await page
      .getByRole('button', { name: /submit|kirim/i })
      .last()
      .click();
    await expect(page).toHaveURL(/\/app\/mock-exams\/.*\/result/);

    // Result evidence is derived from the submitted answers and a priority change needs approval.
    await expect(page.getByText(/2 dari 3|2 of 3/i)).toBeVisible();
    await expect(page.getByText(/recommended next step|langkah selanjutnya/i)).toBeVisible();
    await expect(page.getByText(/pending your approval|menunggu persetujuan/i)).toBeVisible();
    await page
      .getByRole('button', { name: /approve preview plan change|setujui perubahan/i })
      .click();
    await expect(
      page.getByText(/priority change approved|prioritas pratinjau disetujui/i),
    ).toBeVisible();
    await page.getByRole('link', { name: /open assigned remediation|buka perbaikan/i }).click();
    await expect(page).toHaveURL(/\/app\/practice\/practice-factorisation-1/);
  });
});
