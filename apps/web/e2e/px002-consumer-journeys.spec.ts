import { test, expect, type Page } from '@playwright/test';

async function completeParentOnboarding(page: Page): Promise<void> {
  // Establish preview credential session first (required by RoleSelectionGuard)
  await page.goto('/login');
  await page.getByLabel(/email/i).first().fill('parent@example.test');
  await page
    .getByLabel(/password|kata sandi/i)
    .first()
    .fill('securepass123');
  await page.getByRole('button', { name: /masuk|sign in/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/role/);

  const parentCard = page.locator('.role-card', { hasText: /orang tua|parent/i });
  await parentCard.click();
  await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/parent/);

  await page.getByLabel(/nama lengkap|full name/i).fill('Dewi Kusuma');
  await page.getByLabel(/email kontak|contact email/i).fill('dewi@example.test');
  await page.getByRole('button', { name: /lanjut ke.*privasi|continue to privacy/i }).click();

  await page.getByRole('checkbox', { name: /terms|ketentuan/i }).check();
  await page.getByRole('button', { name: /lanjut ke.*ringkasan|continue to.*summary/i }).click();

  await page.getByRole('button', { name: /masuk ke ruang kerja|enter.*workspace/i }).click();
  await expect(page).toHaveURL(/\/parent\/home/);
}

async function linkStudent(page: Page): Promise<void> {
  // Navigate within SPA to preserve consumer state
  await page.getByRole('link', { name: /terima.*undangan|accept.*invitation/i }).click();
  await expect(page).toHaveURL(/\/parent\/invitations\//);
  await page.getByRole('button', { name: /terima|accept/i }).click();
  await expect(page).toHaveURL(/\/parent\/home/);
}

test.describe('PX-002 Journey A2: Credential registration preview', () => {
  test('public Home → Register → verification → Student PX-001 handoff', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/CSCA/i);

    await page
      .getByRole('link', { name: /buat akun|create account/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByLabel(/email/i).first().fill('preview@example.test');
    await page
      .getByLabel(/password|kata sandi/i)
      .first()
      .fill('securepass123');
    await page.getByLabel(/confirm|konfirmasi/i).fill('securepass123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /buat akun|create account/i }).click();

    await expect(page).toHaveURL(/\/verify-email/);
    await page.getByRole('button', { name: /verif/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/role/);
    await expect(page.locator('h1')).toContainText(/peran|role/i);
    await page.screenshot({
      path: '../../output/playwright/px002-review/role-selection-mobile.png',
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const studentCard = page.locator('.role-card', { hasText: /siswa|student/i });
    await studentCard.click();
    await page.getByRole('button', { name: /lanjutkan|continue/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/student\/goals/);
    await expect(
      page.getByRole('heading', { name: /target akademik|academic goals/i }),
    ).toBeVisible();
    await page.screenshot({
      path: '../../output/playwright/px002-review/a2-student-goals-mobile.png',
      fullPage: true,
    });
  });

  test('credential login preview reaches role selection', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill('user@example.test');
    await page
      .getByLabel(/password|kata sandi/i)
      .first()
      .fill('mypassword1');
    await page.getByRole('button', { name: /masuk|sign in/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/role/);
  });

  test('invalid credential shows error without navigation', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill('wrong@example.test');
    await page
      .getByLabel(/password|kata sandi/i)
      .first()
      .fill('badpass123');
    await page.getByRole('button', { name: /masuk|sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.screenshot({
      path: '../../output/playwright/px002-review/login-invalid-desktop.png',
      fullPage: true,
    });
  });

  test('role selection and Student continuation work from the keyboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill('keyboard@example.test');
    await page
      .getByLabel(/password|kata sandi/i)
      .first()
      .fill('keyboardpass123');
    await page.getByRole('button', { name: /masuk|sign in/i }).click();

    const studentChoice = page.getByRole('radio', { name: /siswa|student/i });
    await studentChoice.focus();
    await page.keyboard.press('Space');
    await expect(studentChoice).toBeChecked();
    await page.getByRole('button', { name: /lanjutkan|continue/i }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/onboarding\/student\/goals/);
  });

  test('forgot password shows non-enumerating confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('anyone@example.test');
    await page.getByRole('button', { name: /kirim|send/i }).click();
    await expect(page.getByRole('status')).toContainText(/jika|if an account/i);
  });
});

test.describe('PX-002 Journey B: Parent and family', () => {
  test('role → parent onboarding → no-linked Home → accept invitation → linked overview', async ({
    page,
  }) => {
    await completeParentOnboarding(page);
    await expect(page.getByText(/belum ada|no student linked/i)).toBeVisible();
    await page.screenshot({
      path: '../../output/playwright/px002-review/parent-home-desktop.png',
      fullPage: true,
    });

    await linkStudent(page);
    await expect(page.getByText(/Rina Kusuma/)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.parent-bottom-nav')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: '../../output/playwright/px002-review/parent-linked-mobile.png',
      fullPage: true,
    });
  });
});

test.describe('PX-002 Journey C: Parent purchase', () => {
  test('checkout → payment → instructions → paid → order detail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await completeParentOnboarding(page);
    await linkStudent(page);

    // Navigate to products via parent home link
    await page.getByRole('link', { name: /lihat produk|browse/i }).click();
    await expect(page).toHaveURL(/\/products/);

    await page
      .getByRole('link', { name: /detail|lihat/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products\//);

    await page.getByRole('button', { name: /pembayaran|checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Select recipient (linked student)
    await page.getByRole('radio', { name: /Rina Kusuma/i }).check();
    await page.getByRole('button', { name: /lanjut|continue/i }).click();
    await expect(page).toHaveURL(/\/checkout\/payment/);
    await page.screenshot({
      path: '../../output/playwright/px002-review/checkout-payment-desktop.png',
      fullPage: true,
    });

    await page.getByText('QRIS').first().click();
    await page.getByRole('button', { name: /konfirmasi|confirm/i }).click();
    await expect(page).toHaveURL(/\/checkout\/instructions/);

    await expect(page.getByText(/sample.*not payable|contoh.*tidak/i).first()).toBeVisible();

    await page.getByRole('button', { name: /paid|lunas|bayar/i }).click();

    await expect(page.getByText(/dibayar|paid/i).first()).toBeVisible();
    await page.screenshot({
      path: '../../output/playwright/px002-review/paid-order-desktop.png',
      fullPage: true,
    });
  });
});

test.describe('PX-002 Journey D: Aftercare', () => {
  test('failed order → support ticket', async ({ page }) => {
    await completeParentOnboarding(page);
    await linkStudent(page);

    // Navigate to checkout via products
    await page.getByRole('link', { name: /lihat produk|browse/i }).click();
    await page
      .getByRole('link', { name: /detail|lihat/i })
      .first()
      .click();
    await page.getByRole('button', { name: /pembayaran|checkout/i }).click();

    await page.getByRole('radio', { name: /Rina Kusuma/i }).check();
    await page.getByRole('button', { name: /lanjut|continue/i }).click();
    await page.getByText('QRIS').first().click();
    await page.getByRole('button', { name: /konfirmasi|confirm/i }).click();

    await page.getByRole('button', { name: /failed|gagal/i }).click();

    // Navigate to support via SPA link (preserves preview state)
    await page.getByRole('link', { name: /dukung|support/i }).click();
    await expect(page).toHaveURL(/\/support\/new/);
    await page.getByLabel(/kategori|category/i).selectOption('payment');
    await page.getByLabel(/jelaskan|describe/i).fill('Payment failed but amount deducted');
    await page.getByRole('button', { name: /kirim|submit/i }).click();

    await expect(page).toHaveURL(/\/support\//);
  });
});

test.describe('PX-002: Public product discovery', () => {
  test('visitor browses products and views detail without auth', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText(/produk|products/i);

    await page
      .getByRole('link', { name: /detail|lihat/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products\/math-english/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /mathematics|matematika|数学/i,
      }),
    ).toBeVisible();

    await page.locator('#public-lang').selectOption('zh-CN');
    await expect(page.getByRole('heading', { level: 1, name: /数学（英语）方案/ })).toBeVisible();
    await page.screenshot({
      path: '../../output/playwright/px002-review/product-detail-zh-tablet.png',
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test('public navigation works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.screenshot({
      path: '../../output/playwright/px002-review/public-home-mobile.png',
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    // Click the hamburger menu button
    await page.locator('button.public-mobile-toggle').click();
    // Click products link in mobile menu
    await page
      .locator('.public-nav-mobile')
      .getByRole('link', { name: /produk|products/i })
      .click();
    await expect(page).toHaveURL(/\/products/);
  });

  test('interface and fixture content switch across all three locales', async ({ page }) => {
    await page.goto('/products/math-english');
    await page.locator('#public-lang').selectOption('id');
    await expect(page.getByRole('heading', { level: 1, name: /Paket Matematika/ })).toBeVisible();
    await page.locator('#public-lang').selectOption('en');
    await expect(
      page.getByRole('heading', { level: 1, name: /Mathematics.*English/i }),
    ).toBeVisible();
    await page.locator('#public-lang').selectOption('zh-CN');
    await expect(page.getByRole('heading', { level: 1, name: /数学（英语）方案/ })).toBeVisible();
  });

  test('reduced-motion preference shortens non-essential motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const motion = await page.locator('.home-hero').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.00002);
    expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.00002);
  });
});
