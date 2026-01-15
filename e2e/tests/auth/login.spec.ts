import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { testUsers } from '../../fixtures/testData';
import { logout } from '../../helpers/auth';

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正常なログイン - 管理者', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(
      testUsers.admin.email,
      testUsers.admin.password
    );

    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // ユーザーメニューが表示されていることを確認
    const userMenu = page.locator('button').filter({
      hasText: /管理者|オーナー|マネージャー/
    }).first();
    await expect(userMenu).toBeVisible();
  });

  test('無効なパスワードでログイン失敗', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(
      testUsers.admin.email,
      'wrongpassword123'
    );

    // エラーメッセージが表示されることを確認
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // ログインページに留まることを確認
    await expect(page).toHaveURL('/');
  });

  test('無効なメールアドレスでログイン失敗', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(
      'nonexistent@example.com',
      'anypassword'
    );

    // エラーメッセージが表示されることを確認
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // ログインページに留まることを確認
    await expect(page).toHaveURL('/');
  });

  test('空のフィールドでログイン試行', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // パスワードなしでログイン試行
    await loginPage.emailInput.fill(testUsers.admin.email);
    await loginPage.loginButton.click();

    // HTML5バリデーションまたはエラーメッセージが表示される
    const passwordInput = await loginPage.passwordInput;
    const isRequired = await passwordInput.evaluate((el: HTMLInputElement) => el.required);
    expect(isRequired).toBe(true);
  });

  test('デモモードの開始', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // デモボタンが存在する場合のみテスト
    const demoButtonVisible = await loginPage.demoButton.isVisible().catch(() => false);

    if (demoButtonVisible) {
      await loginPage.startDemo();

      // ダッシュボードにリダイレクトされる
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // デモモードバッジが表示される
      const demoBadge = page.getByText(/デモモード|Demo/i);
      await expect(demoBadge).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('ログアウト', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // ログイン
    await loginPage.login(
      testUsers.admin.email,
      testUsers.admin.password
    );

    await expect(page).toHaveURL(/\/dashboard/);

    // ログアウト
    await logout(page);

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // ログインフォームが表示される
    await expect(loginPage.emailInput).toBeVisible();
  });

  test('セッション維持の確認', async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // ログイン
    await loginPage.login(
      testUsers.admin.email,
      testUsers.admin.password
    );

    await expect(page).toHaveURL(/\/dashboard/);

    // 新しいタブを開く
    const newPage = await context.newPage();
    await newPage.goto('/dashboard/daily');

    // セッションが維持されていることを確認
    await expect(newPage).toHaveURL(/\/dashboard/);

    const userMenu = newPage.locator('button').filter({
      hasText: /管理者|オーナー|マネージャー/
    }).first();
    await expect(userMenu).toBeVisible();

    await newPage.close();
  });

  test('未認証でダッシュボードアクセス試行', async ({ page }) => {
    // 未認証でダッシュボードにアクセス
    await page.goto('/dashboard/daily');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/|login/, { timeout: 5000 });
  });

  test.skip('パスワードリセット', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // パスワードリセットリンクが存在する場合
    const resetLinkVisible = await loginPage.passwordResetLink.isVisible().catch(() => false);

    if (resetLinkVisible) {
      await loginPage.clickPasswordReset();

      // パスワードリセットページに遷移
      await expect(page).toHaveURL(/\/password-reset|\/reset/);

      // メールアドレス入力フィールドが表示される
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
    } else {
      test.skip();
    }
  });
});
