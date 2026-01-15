import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly demoButton: Locator;
  readonly passwordResetLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.getByRole('button', { name: /ログイン|login/i });
    this.errorMessage = page.locator('[role="alert"]');
    this.demoButton = page.getByRole('button', { name: /デモを試す|デモ体験/i });
    this.passwordResetLink = page.getByRole('link', { name: /パスワードを忘れた/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async startDemo() {
    await this.demoButton.click();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async clickPasswordReset() {
    await this.passwordResetLink.click();
  }

  async waitForNavigation() {
    await this.page.waitForURL(/\/dashboard/);
  }
}
