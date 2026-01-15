# 🚀 E2Eテスト クイックスタート（5分）

最速でE2Eテストを実行する方法。

---

## 📋 前提条件

- ✅ Node.js v18以上
- ✅ Git
- ✅ インターネット接続

---

## ⚡ 5分でテスト実行

### 1. セットアップ（3分）

```bash
# プロジェクトに移動（または git clone）
cd ai-management-system

# インストール
npm install
npx playwright install --with-deps
```

### 2. 環境変数設定（1分）

`.env.test`を作成:

```env
E2E_ADMIN_EMAIL=test-admin@example.com
E2E_ADMIN_PASSWORD=TestPass123!@#
E2E_TEST_EMAIL=test-user@example.com
E2E_TEST_PASSWORD=TestPass123!@#

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. テストユーザー作成（1分）

Supabase Dashboard → Authentication → Add User:
- Email: `test-admin@example.com`
- Password: `TestPass123!@#`
- Auto Confirm: ✅ ON

### 4. devサーバー起動

```bash
# 別ターミナルで
npm run dev
```

### 5. テスト実行！

```bash
# UIモード（推奨）
npm run test:e2e:ui

# またはコマンドライン
npm run test:e2e
```

---

## 🎉 成功！

```
31 passed (5m 23s)
```

詳細は `E2E_LOCAL_SETUP_GUIDE.md` を参照。

---

## 🔧 トラブルシューティング

### ログイン失敗
- Supabaseでユーザーを確認
- `.env.test`の認証情報を確認

### ブラウザエラー
```bash
npx playwright install --with-deps
```

### タイムアウト
- devサーバーが起動しているか確認
- `http://localhost:5173` にアクセス可能か確認

---

## 📚 詳細ガイド

完全なセットアップガイド:
→ `E2E_LOCAL_SETUP_GUIDE.md`

実装詳細:
→ `E2E_TEST_IMPLEMENTATION.md`

現状レポート:
→ `E2E_TEST_STATUS.md`
