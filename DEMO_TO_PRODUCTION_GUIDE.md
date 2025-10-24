# デモモード削除 → 本番運用移行ガイド

このドキュメントは、システムからデモモードを完全に削除し、本番運用に移行するための完全ガイドです。

---

## 🎯 実施内容サマリー

### ✅ 完了した修正

1. **環境変数にDEMO_MODEフラグを追加**
   - `.env.example`
   - `.env.production.example`

2. **AuthContextを完全書き直し**
   - デモユーザー（mockUsers）削除
   - ロール選択機能（showRoleSelection）削除
   - signInDemo, signInWithRole 削除
   - Supabase Auth専用に統一

3. **LoginForm完全書き直し**
   - デモログインUI削除
   - ロール選択画面削除
   - Supabase Auth専用のシンプルなログインフォーム

4. **RoleSelectorコンポーネント削除**
   - `src/components/auth/RoleSelector.tsx`
   - `src/components/Auth/RoleSelector.tsx`

5. **Edge Functions CORS設定改善**
   - 環境変数`ALLOWED_ORIGIN`でドメイン制限可能
   - デフォルトは `*`（開発用）

6. **本番用SQLドキュメント作成**
   - `PRODUCTION_SETUP_SQL.md`
   - プロファイル自動作成トリガー
   - 完全なRLSポリシー
   - データ初期化手順

---

## 📋 本番デプロイ前のチェックリスト

### 1. データベース設定（Supabase Dashboard）

#### 1-1. プロファイル自動作成トリガーを実行

`PRODUCTION_SETUP_SQL.md` のSQL（セクション1）をSupabase SQL Editorで実行:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() ...
CREATE TRIGGER on_auth_user_created ...
```

#### 1-2. RLSポリシーを完全実装

`PRODUCTION_SETUP_SQL.md` のSQL（セクション2）を実行:

```sql
-- admin判定関数
CREATE OR REPLACE FUNCTION public.is_admin() ...

-- 各テーブルのポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ...
```

**確認**:
```sql
SELECT * FROM rls_status WHERE rls_enabled = false;
```

期待結果: 0行（全テーブルRLS有効）

#### 1-3. テストデータ削除

**⚠️ 警告: 本番DBで実行前に必ずバックアップ！**

```sql
BEGIN;
DELETE FROM auth.users WHERE email IN (
  'admin@example.com', 'admin@demo.com',
  'manager@demo.com', 'staff@demo.com'
);
SELECT email FROM auth.users;  -- 確認
COMMIT;  -- 問題なければ
```

#### 1-4. 初期管理者アカウント作成

Supabase Dashboard → `Authentication` → `Users` → `Add user`

- Email: 実際の管理者メールアドレス
- Password: 強力なパスワード
- Auto Confirm User: ON

作成後、権限を付与:

```sql
UPDATE profiles
SET role = 'admin', name = '本部統括責任者'
WHERE email = 'admin@your-domain.com';
```

#### 1-5. 本番用店舗マスター登録

```sql
INSERT INTO stores (id, name, address, is_active) VALUES
  (gen_random_uuid(), '居酒屋いっき 豊洲店', '東京都江東区豊洲○-○-○', true),
  (gen_random_uuid(), '居酒屋いっき 有明店', '東京都江東区有明○-○-○', true);
```

#### 1-6. 店舗割当設定

```sql
-- 管理者に全店舗を割当
INSERT INTO store_assignments (user_id, store_id, created_at)
SELECT p.id, s.id, NOW()
FROM profiles p
CROSS JOIN stores s
WHERE p.role = 'admin' AND s.is_active = true
ON CONFLICT (user_id, store_id) DO NOTHING;
```

#### 1-7. 業者マスター登録

```sql
INSERT INTO vendors (id, name, category, is_active) VALUES
  (gen_random_uuid(), '豊洲市場青果卸', 'vegetable_meat', true),
  (gen_random_uuid(), '築地海産物', 'seafood', true),
  (gen_random_uuid(), '酒類卸売', 'alcohol', true);

-- 店舗に業者を割当
INSERT INTO store_vendor_assignments (store_id, vendor_id, display_order)
SELECT s.id, v.id, ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY v.name) - 1
FROM stores s CROSS JOIN vendors v
WHERE s.is_active = true AND v.is_active = true;
```

---

### 2. Supabase Edge Functions設定

#### 2-1. Secrets設定

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# OpenAI API Key（必須）
supabase secrets set OPENAI_API_KEY=sk-prod-xxxxxxxxxxxxx

# 本番ドメイン（推奨）
supabase secrets set ALLOWED_ORIGIN=https://your-domain.vercel.app

# 確認
supabase secrets list
```

#### 2-2. Edge Functionsデプロイ

```bash
supabase functions deploy chat-gpt
supabase functions deploy sync-to-sheets
```

---

### 3. Supabase Auth設定

Supabase Dashboard → `Authentication`

#### 3-1. Email認証を有効化

`Providers` → `Email` → `Enable Email Provider` をON

#### 3-2. hCaptcha設定（bot防止）

1. https://www.hcaptcha.com/ でSite Key取得
2. `Settings` → `Security and Protection` → `Enable hCaptcha` をON
3. Site Key / Secret Key を入力

#### 3-3. SMTP設定（本番用）

`Project Settings` → `Auth` → `SMTP Settings`

- Host: smtp.your-domain.com
- Port: 587
- Username: noreply@your-domain.com
- Password: [SMTPパスワード]

---

### 4. 環境変数設定

#### 4-1. .env.production ファイル作成

```bash
cp .env.production.example .env.production
```

編集:
```env
VITE_DEMO_MODE=false
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyxxxxxxxxxxxxx
VITE_GOOGLE_SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
NODE_ENV=production
```

#### 4-2. Vercel環境変数設定

```bash
vercel login
vercel link

vercel env add VITE_DEMO_MODE production
# → false

vercel env add VITE_USE_SUPABASE production
# → true

vercel env add VITE_SUPABASE_URL production
# → https://xxxxxxxxxxxx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add VITE_GOOGLE_SHEETS_API_KEY production
vercel env add VITE_GOOGLE_SHEET_ID production
```

---

### 5. ビルド確認

```bash
npm run build
```

期待結果:
```
✓ 2685 modules transformed.
dist/index.html                         0.70 kB │ gzip:  0.40 kB
dist/assets/index-xxx.css              52.26 kB │ gzip:  9.12 kB
dist/assets/ui-vendor-xxx.js           92.78 kB │ gzip: 31.30 kB
dist/assets/react-vendor-xxx.js       158.90 kB │ gzip: 51.67 kB
dist/assets/index-xxx.js              250.11 kB │ gzip: 66.05 kB
dist/assets/chart-vendor-xxx.js       342.80 kB │ gzip: 97.25 kB
✓ built in 17.34s
```

---

### 6. Vercelデプロイ

```bash
vercel --prod
```

デプロイ成功後、URLが表示されます:
```
https://your-app.vercel.app
```

---

### 7. 本番ドメイン設定（オプション）

Vercel Dashboard → `Settings` → `Domains`

1. カスタムドメインを追加（例: reports.izakaya-ikki.com）
2. DNS設定をVercelの指示に従って更新
3. SSL証明書が自動設定されます

---

### 8. CORS設定（本番ドメイン確定後）

Supabase Edge Functionsの`ALLOWED_ORIGIN`を更新:

```bash
supabase secrets set ALLOWED_ORIGIN=https://reports.izakaya-ikki.com

# Edge Functionを再デプロイ
supabase functions deploy chat-gpt
```

---

## 🧪 動作確認テスト

### 1. 認証フロー

- [ ] ログインページにアクセス
- [ ] デモログインボタンが表示されない
- [ ] ロール選択画面が表示されない
- [ ] 管理者アカウントでログイン成功
- [ ] ダッシュボードにリダイレクト

### 2. プロファイル自動作成

- [ ] 新規ユーザーでサインアップ
- [ ] ログイン成功
- [ ] プロファイルが自動作成されている

確認SQL:
```sql
SELECT * FROM profiles WHERE email = 'new-user@example.com';
```

### 3. 権限制御

- [ ] 管理者: 全店舗データ閲覧可能
- [ ] 店長: 割当店舗のみ閲覧可能
- [ ] スタッフ: 割当店舗のみ閲覧可能
- [ ] 他ユーザーのデータは閲覧不可

### 4. 日報機能

- [ ] 日報作成
- [ ] 仕入内訳入力
- [ ] 保存成功
- [ ] 一覧表示

### 5. AI機能

- [ ] AIチャット起動
- [ ] メッセージ送信
- [ ] ChatGPT応答確認
- [ ] エラーハンドリング（APIキー無効時）

### 6. CORS確認

```bash
curl -I -X OPTIONS \
  https://your-app.vercel.app/functions/v1/chat-gpt \
  -H "Origin: https://your-domain.com"
```

期待ヘッダー:
```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## 🔍 トラブルシューティング

### エラー: "Supabaseが設定されていません"

**原因**: 環境変数が正しく設定されていない

**解決策**:
```bash
# Vercel環境変数を確認
vercel env ls

# 不足している変数を追加
vercel env add VITE_SUPABASE_URL production
```

### エラー: "プロファイルの取得に失敗しました"

**原因**: プロファイル自動作成トリガーが動作していない

**解決策**:
```sql
-- トリガーを確認
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 手動でプロファイル作成
INSERT INTO profiles (id, email, name, role)
SELECT id, email, split_part(email, '@', 1), 'staff'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

### エラー: "Row Level Security policy violation"

**原因**: RLSポリシーが不足

**解決策**:
```sql
-- 該当テーブルのポリシーを確認
SELECT * FROM rls_policies WHERE tablename = '<table_name>';

-- `PRODUCTION_SETUP_SQL.md` のポリシーを再実行
```

### AIチャットが動作しない

**原因**: OpenAI API Keyが未設定またはCORS

**解決策**:
```bash
# Secretsを確認
supabase secrets list

# 設定
supabase secrets set OPENAI_API_KEY=sk-prod-xxxxx

# Edge Functionを再デプロイ
supabase functions deploy chat-gpt
```

---

## 📊 本番運用開始後の監視

### 1. Supabase

- `Dashboard` → `Reports` でクエリパフォーマンス確認
- `Logs` → `Edge Functions` でAPIエラー監視

### 2. Vercel

- `Analytics` でページビュー確認
- `Logs` でビルド・デプロイエラー監視

### 3. OpenAI

- OpenAIダッシュボードでAPI使用量監視
- Usage Limitsで月額予算設定（推奨: $50/月）

### 4. Sentry（推奨）

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});
```

---

## ✅ 最終チェックリスト

### データベース
- [ ] RLS全テーブル有効化確認
- [ ] プロファイル自動作成トリガー動作確認
- [ ] テストデータ削除完了
- [ ] 初期管理者アカウント作成
- [ ] 本番用店舗マスター登録
- [ ] 店舗割当設定完了
- [ ] 業者マスター登録完了

### Edge Functions
- [ ] OpenAI API Key設定
- [ ] ALLOWED_ORIGIN設定（本番ドメイン）
- [ ] chat-gpt デプロイ完了
- [ ] sync-to-sheets デプロイ完了

### Auth設定
- [ ] Email認証有効化
- [ ] hCaptcha有効化（推奨）
- [ ] SMTP設定（推奨）

### 環境変数
- [ ] .env.production作成
- [ ] Vercel環境変数設定完了
- [ ] VITE_DEMO_MODE=false

### デプロイ
- [ ] npm run build 成功
- [ ] vercel --prod 完了
- [ ] カスタムドメイン設定（オプション）

### 動作確認
- [ ] ログイン成功
- [ ] プロファイル自動作成確認
- [ ] 権限制御動作確認
- [ ] 日報作成・保存確認
- [ ] AIチャット動作確認

### 監視・バックアップ
- [ ] バックアップ設定確認
- [ ] エラー監視ツール導入（Sentry等）
- [ ] 定期メンテナンススケジュール確立

---

## 🎉 本番運用開始！

すべてのチェックリストが✅になったら、本番運用を開始できます。

**次のステップ**:
1. スタッフトレーニング実施
2. 運用マニュアル配布
3. 1週間の試用期間設定
4. フィードバック収集
5. 継続的な改善

---

## 📞 サポート

問題が発生した場合:

- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs
- **OpenAI**: https://platform.openai.com/docs
- **プロジェクトドキュメント**:
  - `PRODUCTION_SETUP_SQL.md`
  - `PRODUCTION_DEPLOY.md`
  - `PRODUCTION_BLOCKER_FIXES.md`
