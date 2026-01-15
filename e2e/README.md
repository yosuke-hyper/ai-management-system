# E2E Tests - FoodValue AI Management System

このディレクトリには、FoodValue AI経営分析システムのEnd-to-End (E2E) テストが含まれています。

## 📚 ディレクトリ構造

```
e2e/
├── fixtures/           # テストデータ
│   ├── testData.ts    # ユーザー、店舗、レポートのテストデータ
│   └── mockData.ts    # API モックデータ
├── helpers/            # ヘルパー関数
│   ├── auth.ts        # 認証ヘルパー
│   ├── navigation.ts  # ナビゲーションヘルパー
│   └── assertions.ts  # アサーションヘルパー
├── pages/              # Page Object Model
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── ReportFormPage.ts
│   └── AdminSettingsPage.ts
└── tests/              # テストケース
    ├── auth/          # 認証テスト
    ├── dashboard/     # ダッシュボードテスト
    ├── reports/       # レポートテスト
    ├── admin/         # 管理機能テスト
    └── ai/            # AI機能テスト
```

## 🚀 クイックスタート（5分でテスト実行）

### ⚡ 最速セットアップ

```bash
# 1. 依存関係とブラウザをインストール
npm install
npx playwright install --with-deps

# 2. 環境変数を設定（.env.testを編集）
cp .env.test.example .env.test
vim .env.test  # 実際の認証情報を入力

# 3. セットアップチェック
./e2e/check-setup.sh

# 4. devサーバー起動（別ターミナル）
npm run dev

# 5. テスト実行！
npm run test:e2e:ui  # UIモード（推奨）
```

**詳細なセットアップガイド**: `e2e/QUICKSTART.md` または `E2E_LOCAL_SETUP_GUIDE.md` を参照

---

## 📋 詳細セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Playwrightブラウザのインストール

```bash
# システム依存関係も含めてインストール（推奨）
npx playwright install --with-deps

# またはブラウザのみ
npx playwright install
```

### 3. テストユーザーの作成

Supabase Dashboardで以下のユーザーを作成:

- **管理者**: `test-admin@example.com` / `TestPass123!@#`
- **一般ユーザー**: `test-user@example.com` / `TestPass123!@#`

**Auto Confirm User**: ✅ ON

### 4. 環境変数の設定

`.env.test` ファイルを作成し、以下の環境変数を設定してください：

```env
E2E_BASE_URL=http://localhost:5173
E2E_ADMIN_EMAIL=test-admin@example.com
E2E_ADMIN_PASSWORD=TestPass123!@#
E2E_TEST_EMAIL=test-user@example.com
E2E_TEST_PASSWORD=TestPass123!@#
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key  # AI機能テスト用（オプション）
```

## 🧪 テストの実行

### 全テスト実行

```bash
npm run test:e2e
```

### UIモードで実行（推奨）

```bash
npm run test:e2e:ui
```

### ヘッドレスモードで実行

```bash
npm run test:e2e:headed
```

### デバッグモード

```bash
npm run test:e2e:debug
```

### 特定のテストのみ実行

```bash
# 認証テストのみ
npx playwright test auth/

# 日報作成テストのみ
npx playwright test reports/daily-report.spec.ts

# 特定のブラウザで実行
npx playwright test --project=chromium
```

## 📊 テストレポート

テスト実行後、レポートを確認できます：

```bash
npm run test:e2e:report
```

レポートは `playwright-report/` ディレクトリに生成されます。

## 🔧 テストの書き方

### Page Object Model の使用

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { loginAsAdmin } from '../helpers/auth';

test('ログインテスト', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin@example.com', 'password');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### ヘルパー関数の使用

```typescript
test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('ダッシュボードテスト', async ({ page }) => {
  await navigateToDashboard(page, 'daily');
  await assertSuccessMessage(page);
});
```

## 🎯 テストの優先度

### P0 (最優先) - 実装済み
- ✅ 認証フロー (`auth/login.spec.ts`)
- ✅ 日報登録 (`reports/daily-report.spec.ts`)
- ✅ ダッシュボード表示 (`dashboard/dashboard.spec.ts`)

### P1 (高優先度) - 今後実装予定
- AI機能テスト
- 店舗管理テスト
- 目標設定テスト
- 権限管理テスト

### P2 (中優先度) - 今後実装予定
- CSVインポートテスト
- レスポンシブUIテスト
- パフォーマンステスト

## 🐛 デバッグ

### スクリーンショット確認

テスト失敗時のスクリーンショットは `test-results/` ディレクトリに保存されます。

### トレース確認

```bash
npx playwright show-trace test-results/.../trace.zip
```

### ステップバイステップデバッグ

```bash
npx playwright test --debug
```

## 📝 ベストプラクティス

1. **Page Object Model を使用する**
   - UI要素の変更に強い
   - 再利用可能なコード

2. **明確なテスト名をつける**
   - 日本語で具体的に記述
   - 何をテストしているか一目で分かる

3. **適切なタイムアウトを設定**
   - ネットワーク依存の処理は十分なタイムアウトを
   - デフォルトは10秒

4. **独立したテストを書く**
   - 各テストは他のテストに依存しない
   - beforeEach でクリーンな状態を作る

5. **モックデータを活用**
   - 外部APIはモック化
   - テストの安定性向上

## 🔄 CI/CD

GitHub Actionsで自動実行されます：

- main/developブランチへのpush時
- Pull Request作成時
- 手動実行（workflow_dispatch）

ワークフロー: `.github/workflows/e2e-tests.yml`

## 📚 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

## 🆘 トラブルシューティング

### テストが失敗する

1. 環境変数が正しく設定されているか確認
2. テスト用のSupabaseプロジェクトを使用しているか確認
3. ブラウザが最新版か確認: `npx playwright install`

### タイムアウトエラー

- ネットワークが遅い場合、タイムアウトを延長:
  ```typescript
  await expect(element).toBeVisible({ timeout: 30000 });
  ```

### セレクターが見つからない

- Playwright Inspector でセレクターを確認:
  ```bash
  npx playwright test --debug
  ```

## 📞 お問い合わせ

テストに関する質問や問題がある場合は、開発チームまでお問い合わせください。
