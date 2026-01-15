import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

export async function loginAsUser(
  page: Page,
  email: string,
  password: string
) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await loginPage.waitForNavigation();
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'adminpass123';
  await loginAsUser(page, email, password);
}

export async function loginAsOwner(page: Page) {
  const email = process.env.E2E_OWNER_EMAIL || 'owner@example.com';
  const password = process.env.E2E_OWNER_PASSWORD || 'ownerpass123';
  await loginAsUser(page, email, password);
}

export async function loginAsTestUser(page: Page) {
  const email = process.env.E2E_TEST_EMAIL || 'test@example.com';
  const password = process.env.E2E_TEST_PASSWORD || 'testpassword123';
  await loginAsUser(page, email, password);
}

export async function startDemoMode(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.startDemo();
  await page.waitForURL(/\/dashboard/);
}

export async function logout(page: Page) {
  const userMenuButton = page.locator('button').filter({
    hasText: /管理者|オーナー|マネージャー|スタッフ/
  }).first();

  await userMenuButton.click();
  await page.getByRole('menuitem', { name: /ログアウト/i }).click();
  await page.waitForURL('/');
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
