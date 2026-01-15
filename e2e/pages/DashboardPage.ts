import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly salesMetric: Locator;
  readonly profitMetric: Locator;
  readonly costRateMetric: Locator;
  readonly laborRateMetric: Locator;
  readonly storeSelector: Locator;
  readonly dateRangePicker: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly dailyTab: Locator;
  readonly weeklyTab: Locator;
  readonly monthlyTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.salesMetric = page.getByTestId('metric-sales').or(page.locator('text=/売上/').locator('..'));
    this.profitMetric = page.getByTestId('metric-profit').or(page.locator('text=/営業利益/').locator('..'));
    this.costRateMetric = page.getByTestId('metric-cost-rate').or(page.locator('text=/原価率/').locator('..'));
    this.laborRateMetric = page.getByTestId('metric-labor-rate').or(page.locator('text=/人件費率/').locator('..'));
    this.storeSelector = page.locator('select, [role="combobox"]').first();
    this.dateRangePicker = page.getByRole('button', { name: /期間|日付/ });
    this.userMenu = page.locator('button').filter({ hasText: /管理者|オーナー|マネージャー|スタッフ/ }).first();
    this.logoutButton = page.getByRole('menuitem', { name: /ログアウト/i });
    this.dailyTab = page.getByRole('link', { name: /日次|デイリー/i });
    this.weeklyTab = page.getByRole('link', { name: /週次|ウィークリー/i });
    this.monthlyTab = page.getByRole('link', { name: /月次|マンスリー/i });
  }

  async goto(view: 'daily' | 'weekly' | 'monthly' = 'daily') {
    await this.page.goto(`/dashboard/${view}`);
  }

  async selectStore(storeName: string) {
    await this.storeSelector.click();
    await this.page.getByRole('option', { name: storeName }).click();
  }

  async getSalesValue() {
    const text = await this.salesMetric.textContent();
    return text?.replace(/[^0-9]/g, '') || '0';
  }

  async getProfitValue() {
    const text = await this.profitMetric.textContent();
    return text?.replace(/[^0-9]/g, '') || '0';
  }

  async verifyMetricsLoaded() {
    await expect(this.salesMetric).toBeVisible({ timeout: 10000 });
    await expect(this.profitMetric).toBeVisible();
    await expect(this.costRateMetric).toBeVisible();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }

  async switchToDaily() {
    await this.dailyTab.click();
  }

  async switchToWeekly() {
    await this.weeklyTab.click();
  }

  async switchToMonthly() {
    await this.monthlyTab.click();
  }

  async waitForDataLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
