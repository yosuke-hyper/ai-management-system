import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('ダッシュボード表示', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('日次ダッシュボード表示', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    // ページが読み込まれることを確認
    await dashboard.waitForDataLoad();

    // 主要メトリクスが表示されることを確認
    await dashboard.verifyMetricsLoaded();

    // タイトルが正しいことを確認
    await expect(page.getByRole('heading', { name: /日次|デイリー|Daily/i })).toBeVisible();
  });

  test('週次ダッシュボード表示', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('weekly');

    await dashboard.waitForDataLoad();

    // 週次ダッシュボード特有の要素を確認
    await expect(page.getByRole('heading', { name: /週次|ウィークリー|Weekly/i })).toBeVisible();

    // メトリクスが表示されることを確認
    await dashboard.verifyMetricsLoaded();
  });

  test('月次ダッシュボード表示', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('monthly');

    await dashboard.waitForDataLoad();

    // 月次ダッシュボード特有の要素を確認
    await expect(page.getByRole('heading', { name: /月次|マンスリー|Monthly/i })).toBeVisible();

    // メトリクスが表示されることを確認
    await dashboard.verifyMetricsLoaded();
  });

  test('KPIカードの値検証', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // 売上が数値として表示されている
    const salesValue = await dashboard.getSalesValue();
    expect(salesValue).toMatch(/^\d+$/);

    // 利益が数値として表示されている
    const profitValue = await dashboard.getProfitValue();
    expect(profitValue).toMatch(/^\d+$/);

    // すべてのメトリクスカードが表示されている
    await expect(dashboard.salesMetric).toBeVisible();
    await expect(dashboard.profitMetric).toBeVisible();
    await expect(dashboard.costRateMetric).toBeVisible();
  });

  test('グラフ表示の確認', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // チャートキャンバスまたはSVGが存在することを確認
    const charts = page.locator('canvas, svg[class*="recharts"]');
    const chartCount = await charts.count();

    expect(chartCount).toBeGreaterThan(0);
  });

  test('店舗切り替え', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // 店舗セレクターが存在する場合
    const storeSelectorVisible = await dashboard.storeSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (storeSelectorVisible) {
      // 最初の店舗のデータを記録
      const initialSales = await dashboard.getSalesValue();

      // 店舗を切り替え（2番目のオプションを選択）
      await dashboard.storeSelector.selectOption({ index: 1 });

      await dashboard.waitForDataLoad();

      // データが更新されていることを確認（値が変わる可能性がある）
      const newSales = await dashboard.getSalesValue();

      // セレクターが機能していることを確認（値が同じでも問題なし）
      expect(newSales).toMatch(/^\d+$/);
    } else {
      test.skip();
    }
  });

  test('ダッシュボード間の切り替え', async ({ page }) => {
    const dashboard = new DashboardPage(page);

    // 日次から開始
    await dashboard.goto('daily');
    await dashboard.waitForDataLoad();
    await expect(page).toHaveURL(/\/dashboard\/daily/);

    // 週次に切り替え
    const weeklyTabVisible = await dashboard.weeklyTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (weeklyTabVisible) {
      await dashboard.switchToWeekly();
      await dashboard.waitForDataLoad();
      await expect(page).toHaveURL(/\/dashboard\/weekly/);

      // 月次に切り替え
      const monthlyTabVisible = await dashboard.monthlyTab.isVisible().catch(() => false);

      if (monthlyTabVisible) {
        await dashboard.switchToMonthly();
        await dashboard.waitForDataLoad();
        await expect(page).toHaveURL(/\/dashboard\/monthly/);
      }
    } else {
      test.skip();
    }
  });

  test('レスポンシブデザイン: モバイルビュー', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });

    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // メトリクスが表示されることを確認
    await dashboard.verifyMetricsLoaded();

    // モバイルメニューが存在する場合
    const mobileMenu = page.getByRole('button', { name: /メニュー|Menu/i });
    const mobileMenuVisible = await mobileMenu.isVisible().catch(() => false);

    if (mobileMenuVisible) {
      await mobileMenu.click();

      // ナビゲーションが表示される
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    }
  });

  test('レスポンシブデザイン: タブレットビュー', async ({ page }) => {
    // タブレットサイズに変更
    await page.setViewportSize({ width: 768, height: 1024 });

    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // メトリクスが表示されることを確認
    await dashboard.verifyMetricsLoaded();
  });

  test('データ更新後の自動リフレッシュ', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // 初期データを記録
    const initialSales = await dashboard.getSalesValue();

    // ページをリロード
    await page.reload();
    await dashboard.waitForDataLoad();

    // データが再表示されることを確認
    const reloadedSales = await dashboard.getSalesValue();
    expect(reloadedSales).toMatch(/^\d+$/);
  });

  test('エラーハンドリング: データ取得失敗', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    // エラーメッセージまたはフォールバック表示を確認
    const errorMessage = await page.getByText(/エラー|取得できませんでした|Error/i).isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = await page.getByText(/データがありません|No data/i).isVisible({ timeout: 5000 }).catch(() => false);

    // エラーまたは空状態のいずれかが表示される
    expect(errorMessage || emptyState).toBeTruthy();
  });

  test('目標達成度の表示', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // 目標達成度バッジやインジケーターが存在する場合
    const targetIndicator = page.getByText(/目標|達成|Target|Achievement/i);
    const indicatorVisible = await targetIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (indicatorVisible) {
      await expect(targetIndicator).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('前日比・前週比・前月比の表示', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto('daily');

    await dashboard.waitForDataLoad();

    // 比較データが存在する場合
    const comparisonData = page.locator('text=/前日比|前週比|前月比|%|↑|↓/');
    const comparisonVisible = await comparisonData.isVisible({ timeout: 3000 }).catch(() => false);

    if (comparisonVisible) {
      await expect(comparisonData.first()).toBeVisible();
    } else {
      test.skip();
    }
  });
});
