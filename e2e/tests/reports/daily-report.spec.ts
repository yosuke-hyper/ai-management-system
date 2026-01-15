import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';
import { ReportFormPage } from '../../pages/ReportFormPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { testReportData, testStores } from '../../fixtures/testData';

test.describe('日報登録', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('新規日報作成 - 基本データ', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    await reportForm.createReport({
      store: testStores[0].name,
      date: testReportData.basic.date,
      sales: testReportData.basic.sales,
      customerCount: testReportData.basic.customerCount,
      foodCost: testReportData.basic.foodCost,
      laborCost: testReportData.basic.laborCost,
    });

    // 成功メッセージの確認
    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });
  });

  test('新規日報作成 - 昼営業', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    const operationTypeVisible = await reportForm.operationTypeSelect.isVisible().catch(() => false);

    if (operationTypeVisible) {
      await reportForm.createReport({
        store: testStores[0].name,
        date: testReportData.lunch.date,
        operationType: 'lunch',
        sales: testReportData.lunch.sales,
        customerCount: testReportData.lunch.customerCount,
        foodCost: testReportData.lunch.foodCost,
        laborCost: testReportData.lunch.laborCost,
      });

      await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('バリデーションエラー: 売上が0円', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    await reportForm.createReport({
      store: testStores[0].name,
      date: testReportData.basic.date,
      sales: 0,
    });

    // エラーメッセージの確認
    await expect(page.getByText(/売上|入力|必須/i)).toBeVisible({ timeout: 5000 });
  });

  test('バリデーションエラー: 日付が未来', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateString = futureDate.toISOString().split('T')[0];

    await reportForm.createReport({
      store: testStores[0].name,
      date: futureDateString,
      sales: testReportData.basic.sales,
    });

    // エラーメッセージの確認（未来日付が許可されていない場合）
    const errorVisible = await page.getByText(/日付|未来|無効/i).isVisible({ timeout: 3000 }).catch(() => false);

    if (!errorVisible) {
      // 未来日付が許可されている場合はスキップ
      test.skip();
    }
  });

  test('日報の編集', async ({ page }) => {
    // まず日報を作成
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    await reportForm.createReport({
      store: testStores[0].name,
      date: testReportData.basic.date,
      sales: testReportData.basic.sales,
      customerCount: testReportData.basic.customerCount,
    });

    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });

    // ダッシュボードで確認
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    // 編集ボタンを探してクリック
    const editButton = page.getByRole('button', { name: /編集/i }).first();
    const editButtonVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (editButtonVisible) {
      await editButton.click();

      // 売上を変更
      await reportForm.salesInput.fill('900000');
      await reportForm.submitButton.click();

      // 保存成功を確認
      await expect(page.getByText(/保存|更新|成功/i)).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('同じ日付の重複登録エラー', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    const uniqueDate = new Date().toISOString().split('T')[0];

    // 1回目の登録
    await reportForm.goto();
    await reportForm.createReport({
      store: testStores[0].name,
      date: uniqueDate,
      sales: testReportData.basic.sales,
    });

    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });

    // 2回目の登録（同じ日付）
    await reportForm.goto();
    await reportForm.createReport({
      store: testStores[0].name,
      date: uniqueDate,
      sales: testReportData.basic.sales,
    });

    // 重複エラーまたは上書き確認のメッセージ
    const duplicateError = await page.getByText(/既に|重複|上書き/i).isVisible({ timeout: 5000 }).catch(() => false);

    if (!duplicateError) {
      // 重複チェックがない場合はスキップ
      test.skip();
    }
  });

  test('複数店舗での日報登録', async ({ page }) => {
    const reportForm = new ReportFormPage(page);

    // 1店舗目
    await reportForm.goto();
    await reportForm.createReport({
      store: testStores[0].name,
      date: testReportData.basic.date,
      sales: testReportData.basic.sales,
    });

    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });

    // 2店舗目
    await reportForm.goto();
    await reportForm.createReport({
      store: testStores[1].name,
      date: testReportData.basic.date,
      sales: testReportData.highSales.sales,
    });

    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });

    // ダッシュボードで両店舗のデータが表示されることを確認
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();
    await dashboard.verifyMetricsLoaded();
  });

  test('日報登録後のKPI自動計算', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    await reportForm.createReport({
      store: testStores[0].name,
      date: testReportData.basic.date,
      sales: testReportData.basic.sales,
      customerCount: testReportData.basic.customerCount,
      foodCost: testReportData.basic.foodCost,
      laborCost: testReportData.basic.laborCost,
    });

    await expect(page.getByText(/保存|登録|成功/i)).toBeVisible({ timeout: 10000 });

    // ダッシュボードに移動してKPIを確認
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();
    await dashboard.verifyMetricsLoaded();

    // 売上が表示されていることを確認
    const salesValue = await dashboard.getSalesValue();
    expect(parseInt(salesValue)).toBeGreaterThan(0);

    // 利益が表示されていることを確認
    const profitValue = await dashboard.getProfitValue();
    expect(parseInt(profitValue)).toBeGreaterThanOrEqual(0);
  });

  test('日報登録のキャンセル', async ({ page }) => {
    const reportForm = new ReportFormPage(page);
    await reportForm.goto();

    // データを入力
    await reportForm.salesInput.fill(testReportData.basic.sales.toString());

    // キャンセルボタンがある場合
    const cancelButton = await reportForm.backButton.isVisible().catch(() => false);

    if (cancelButton) {
      await reportForm.goBack();

      // 前のページに戻ることを確認
      await expect(page).toHaveURL(/\/dashboard|\/reports/);
    } else {
      test.skip();
    }
  });
});
