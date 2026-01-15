import { Page, Locator } from '@playwright/test';

export class AdminSettingsPage {
  readonly page: Page;
  readonly storesTab: Locator;
  readonly vendorsTab: Locator;
  readonly targetsTab: Locator;
  readonly aiLimitsTab: Locator;
  readonly storeNameInput: Locator;
  readonly storeAddressInput: Locator;
  readonly storeManagerInput: Locator;
  readonly addStoreButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.storesTab = page.getByRole('tab', { name: /店舗管理/i });
    this.vendorsTab = page.getByRole('tab', { name: /業者/i });
    this.targetsTab = page.getByRole('tab', { name: /目標/i });
    this.aiLimitsTab = page.getByRole('tab', { name: /AI使用制限/i });
    this.storeNameInput = page.getByLabel(/店舗名/);
    this.storeAddressInput = page.getByLabel(/住所/);
    this.storeManagerInput = page.getByLabel(/店長|責任者/);
    this.addStoreButton = page.getByRole('button', { name: /登録|追加/i });
    this.successMessage = page.locator('[role="status"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/admin/settings');
  }

  async switchToStoresTab() {
    await this.storesTab.click();
  }

  async switchToVendorsTab() {
    await this.vendorsTab.click();
  }

  async switchToTargetsTab() {
    await this.targetsTab.click();
  }

  async switchToAILimitsTab() {
    await this.aiLimitsTab.click();
  }

  async addStore(data: {
    name: string;
    address?: string;
    manager?: string;
  }) {
    await this.storeNameInput.fill(data.name);

    if (data.address) {
      await this.storeAddressInput.fill(data.address);
    }

    if (data.manager) {
      await this.storeManagerInput.fill(data.manager);
    }

    await this.addStoreButton.click();
  }

  async editStore(storeName: string) {
    const editButton = this.page.getByRole('button', { name: '編集' })
      .filter({ has: this.page.locator(`text=${storeName}`) });
    await editButton.click();
  }

  async deleteStore(storeName: string) {
    const deleteButton = this.page.getByRole('button', { name: '削除' })
      .filter({ has: this.page.locator(`text=${storeName}`) });
    await deleteButton.click();

    // 確認ダイアログがある場合
    await this.page.getByRole('button', { name: /削除|はい|OK/i }).click();
  }
}
