import { expect, test, type Page } from '@playwright/test';

const unassignedUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@example.com',
  displayName: 'Google Name',
  avatarUrl: null,
  role: 'UNASSIGNED',
  onboardingCompleted: false,
};

const studentUser = {
  ...unassignedUser,
  displayName: 'Ayu',
  role: 'STUDENT',
  onboardingCompleted: true,
};

async function mockProductionActivationBoundary(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'activation-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: unassignedUser,
      }),
    }),
  );

  await page.route('**/api/v1/student-profile', async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers().authorization).toBe('Bearer activation-access-token');
    expect(request.postDataJSON()).toMatchObject({
      preferredName: 'Ayu',
      currentGrade: 'GRADE_11',
      city: 'Jakarta',
      defaultExplanationLanguage: 'id',
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: unassignedUser.id,
          preferredName: 'Ayu',
          birthYear: 2009,
          currentGrade: 'GRADE_11',
          city: 'Jakarta',
          defaultExplanationLanguage: 'id',
          createdAt: '2026-07-23T00:00:00Z',
          updatedAt: '2026-07-23T00:00:00Z',
        },
        authentication: {
          accessToken: 'student-access-token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: studentUser,
        },
      }),
    });
  });
}

test('connects production session restoration and activation to the isolated Preview journey', async ({
  page,
}) => {
  await mockProductionActivationBoundary(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding\/student$/);

  await page.getByLabel(/preferred name|nama panggilan/i).fill('Ayu');
  await page.getByLabel(/birth year|tahun lahir/i).fill('2009');
  await page.getByLabel(/current grade|kelas saat ini/i).selectOption('GRADE_11');
  await page.getByLabel(/city|kota/i).fill('Jakarta');
  await page
    .getByLabel(/default explanation language|bahasa penjelasan default/i)
    .selectOption('id');
  await page
    .getByRole('button', { name: /activate student profile|aktifkan (profil|akun)/i })
    .click();

  await expect(page).toHaveURL(/\/onboarding\/student\/goals/);
  await page.getByLabel(/target enrollment year|tahun masuk/i).fill('2027');
  await page.getByLabel(/target exam date|tanggal ujian/i).fill('2027-03-15');
  await page.getByLabel(/target major|jurusan/i).fill('Computer Science');
  await page.getByRole('button', { name: /continue to subjects|lanjut ke mata/i }).click();
  await page.getByRole('button', { name: /confirm and start|konfirmasi/i }).click();

  for (let question = 0; question < 3; question += 1) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /next|berikutnya|submit|kirim/i }).click();
  }

  await page.getByRole('button', { name: /view your study plan|lihat rencana/i }).click();
  await page.getByRole('button', { name: /confirm plan|konfirmasi rencana/i }).click();

  await expect(page).toHaveURL(/\/app\/today/);
  await expect(page.getByLabel(/preview mode|mode pratinjau/i)).toBeVisible();
});
