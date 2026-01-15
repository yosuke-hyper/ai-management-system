import { Page, Locator } from '@playwright/test';

export class ReportFormPage {
  readonly page: Page;
  readonly storeSelect: Locator;
  readonly dateInput: Locator;
  readonly operationTypeSelect: Locator;
  readonly salesInput: Locator;
  readonly customerCountInput: Locator;
  readonly foodCostInput: Locator;
  readonly laborCostInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.storeSelect = page.locator('select').filter({ hasText: /店舗/ }).or(page.getByLabel(/店舗/));
    this.dateInput = page.locator('input[type="date"]').or(page.getByLabel(/日付/));
    this.operationTypeSelect = page.getByLabel(/営業種別|昼夜/);
    this.salesInput = page.getByLabel(/売上/);
    this.customerCountInput = page.getByLabel(/客数/);
    this.foodCostInput = page.getByLabel(/食材費|原価/);
    this.laborCostInput = page.getByLabel(/人件費/);
    this.submitButton = page.getByRole('button', { name: /保存|登録/i });
    this.successMessage = page.locator('[role="status"]').or(page.locator('.success-message'));
    this.errorMessage = page.locator('[role="alert"]').or(page.locator('.error-message'));
    this.backButton = page.getByRole('button', { name: /戻る|キャンセル/i });
  }

  async goto() {
    await this.page.goto('/reports/new');
  }

  async gotoEdit(reportId: string) {
    await this.page.goto(`/reports/${reportId}/edit`);
  }

  async createReport(data: {
    store: string;
    date: string;
    operationType?: string;
    sales: number;
    customerCount?: number;
    foodCost?: number;
    laborCost?: number;
  }) {
    if (await this.storeSelect.isVisible()) {
      await this.storeSelect.selectOption(data.store);
    }

    await this.dateInput.fill(data.date);

    if (data.operationType && await this.operationTypeSelect.isVisible()) {
      await this.operationTypeSelect.selectOption(data.operationType);
    }

    await this.salesInput.fill(data.sales.toString());

    if (data.customerCount && await this.customerCountInput.isVisible()) {
      await this.customerCountInput.fill(data.customerCount.toString());
    }

    if (data.foodCost && await this.foodCostInput.isVisible()) {
      await this.foodCostInput.fill(data.foodCost.toString());
    }

    if (data.laborCost && await this.laborCostInput.isVisible()) {
      await this.laborCostInput.fill(data.laborCost.toString());
    }

    await this.submitButton.click();
  }

  async waitForSuccess() {
    await this.successMessage.waitFor({ timeout: 5000 });
  }

  async waitForError() {
    await this.errorMessage.waitFor({ timeout: 5000 });
  }

  async getSuccessMessage() {
    return await this.successMessage.textContent();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async goBack() {
    await this.backButton.click();
  }
}
