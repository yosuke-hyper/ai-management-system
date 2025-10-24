# 本番環境デプロイ手順書

本番環境へのデプロイ前に、このチェックリストを上から順に実行してください。

---

## 🚨 必須修正項目（ブロッカー）

### ✅ 1. Supabase RLS 確認

```sql
-- Supabase SQL Editorで実行
SELECT * FROM rls_status WHERE rls_enabled = false;
```

**期待結果**: 行が返されないこと（全テーブルでRLS有効）

**もし無効なテーブルがあれば:**
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

---

### ✅ 2. Edge Function のデプロイと認証設定

#### 2-1. Secrets設定（サーバーサイド環境変数）

```bash
# Supabase CLI でログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# Secrets設定
supabase secrets set OPENAI_API_KEY=sk-prod-xxxxxxxxxxxxx
supabase secrets set GOOGLE_SHEETS_API_KEY=AIzaSyxxxxxxxxxxxxx

# 確認
supabase secrets list
```

#### 2-2. Edge Functionsデプロイ

```bash
# chat-gpt 関数をデプロイ（JWT認証有効）
supabase functions deploy chat-gpt

# sync-to-sheets 関数をデプロイ
supabase functions deploy sync-to-sheets
```

#### 2-3. 認証確認

本番環境では、Edge Functionは**ユーザーセッショントークン**で認証されます。

**フロントエンド側（既に修正済み）:**
```typescript
// src/pages/AIChatPage.tsx
const { data: { session } } = await supabase!.auth.getSession()

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gpt`,
  {
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    // ...
  }
)
```

---

### ✅ 3. 本番用環境変数の設定

#### 3-1. .env.production ファイル作成

```bash
cp .env.production.example .env.production
```

#### 3-2. 実際の値に置き換え

```env
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyxxxxxxxxxxxxx
VITE_GOOGLE_SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
NODE_ENV=production
```

#### 3-3. Vercel環境変数設定

```bash
vercel env add VITE_SUPABASE_URL production
# 上記で設定した値を入力

vercel env add VITE_SUPABASE_ANON_KEY production
# ANON KEYを入力

vercel env add VITE_GOOGLE_SHEETS_API_KEY production
vercel env add VITE_GOOGLE_SHEET_ID production
```

---

### ✅ 4. Supabase Auth 設定

Supabaseダッシュボードで以下を設定:

#### 4-1. Email認証の有効化

1. `Authentication` → `Providers` → `Email`
2. `Enable Email Provider` をON
3. **Confirm email** はOFFのまま（既存動作を維持）

#### 4-2. SMTP設定（推奨）

本番では独自ドメインのSMTPを設定:

1. `Project Settings` → `Auth` → `SMTP Settings`
2. SMTPサーバー情報を入力
   - Host: smtp.example.com
   - Port: 587
   - Username: noreply@izakaya-ikki.com
   - Password: [SMTPパスワード]

#### 4-3. hCaptcha設定（bot防止）

1. https://www.hcaptcha.com/ でアカウント作成
2. Site Key と Secret Key を取得
3. `Authentication` → `Settings` → `Security and Protection`
4. `Enable hCaptcha protection` をON
5. Site Key / Secret Key を入力

---

### ✅ 5. テストデータの削除

**⚠️ 警告: 本番データベースで実行する前に必ずバックアップを取ってください**

```sql
-- バックアップ確認（Supabaseダッシュボード → Database → Backups）

BEGIN;

-- テストユーザー削除
DELETE FROM auth.users WHERE email LIKE '%@example.com';
DELETE FROM auth.users WHERE email = 'admin@demo.com';
DELETE FROM auth.users WHERE email = 'manager@demo.com';
DELETE FROM auth.users WHERE email = 'staff@demo.com';

-- 不要なサンプルデータ削除（該当する場合）
DELETE FROM daily_reports WHERE date < '2025-01-01';

-- 確認
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM daily_reports;

-- 問題なければコミット
COMMIT;
-- 問題があれば: ROLLBACK;
```

---

### ✅ 6. Vercelデプロイ

#### 6-1. ビルドテスト

```bash
# ローカルで本番ビルドを確認
npm run build

# エラーがないことを確認
# dist/ フォルダが生成されることを確認
```

#### 6-2. Vercelにデプロイ

```bash
# Vercel CLIインストール（初回のみ）
npm install -g vercel

# ログイン
vercel login

# プロジェクトをリンク
vercel link

# 本番デプロイ
vercel --prod
```

#### 6-3. カスタムドメイン設定

1. Vercelダッシュボード → `Settings` → `Domains`
2. ドメインを追加（例: reports.izakaya-ikki.com）
3. DNS設定をVercelの指示に従って更新

---

## 🔒 セキュリティチェックリスト

### 必須項目

- [ ] 全テーブルでRLS有効化確認（`SELECT * FROM rls_status`）
- [ ] デフォルトユーザー（admin@example.com等）を削除
- [ ] `.env.production` がGitにコミットされていないことを確認
- [ ] Supabase ANON KEY（公開鍵）のみフロントで使用
- [ ] Supabase SERVICE ROLE KEY（秘密鍵）はサーバーのみで使用
- [ ] Edge Functions が JWT認証で保護されている
- [ ] OpenAI API Key が Edge Functions の Secrets に設定済み

### 推奨項目

- [ ] hCaptcha 有効化
- [ ] Email認証 有効化（必要に応じて）
- [ ] パスワードポリシー強化（最低8文字）
- [ ] セッションタイムアウト設定（24時間推奨）
- [ ] Sentry等のエラートラッキング導入

---

## 📊 動作確認テスト

### 1. 認証フロー

- [ ] 新規ユーザー登録
- [ ] ログイン
- [ ] ロール選択（デモモード）
- [ ] ログアウト

### 2. 基本機能

- [ ] 日報作成（仕入内訳含む）
- [ ] 日報一覧表示
- [ ] 月次経費入力
- [ ] 目標設定
- [ ] ダッシュボード表示（日次・週次・月次）

### 3. AI機能

- [ ] AIチャット起動
- [ ] メッセージ送信
- [ ] ChatGPT API 応答確認
- [ ] 会話履歴保存
- [ ] ページリロード後の復元
- [ ] 会話検索

### 4. 権限制御

- [ ] 管理者: 全店舗データ閲覧可能
- [ ] 店長: 割当店舗のみ閲覧可能
- [ ] スタッフ: 割当店舗のみ閲覧可能
- [ ] 他ユーザーのデータは閲覧不可

### 5. Google Sheets連携（オプション）

- [ ] 日報データのシート書き込み
- [ ] エラーハンドリング確認

---

## 🚀 デプロイ後の確認

### 1. アプリケーション起動確認

```bash
# デプロイされたURLにアクセス
curl -I https://your-app.vercel.app
# Status: 200 OK を確認
```

### 2. Edge Functions動作確認

```bash
# ChatGPT Edge Functionの疎通確認
curl -X POST \
  https://xxxxxxxxxxxx.supabase.co/functions/v1/chat-gpt \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### 3. データベース接続確認

Supabaseダッシュボード → `Table Editor` で各テーブルにアクセスできることを確認

### 4. RLS動作確認

```sql
-- 一般ユーザーでログイン後、他ユーザーのデータが見えないことを確認
SELECT * FROM daily_reports;  -- 自分の店舗のみ表示されること
```

---

## 📈 パフォーマンス監視

### 1. Supabase

- `Dashboard` → `Reports` でクエリパフォーマンスを確認
- `Database` → `Query Performance` でスロークエリを監視

### 2. Vercel

- `Analytics` でページビュー・レスポンスタイムを確認
- `Logs` でエラーログを確認

### 3. OpenAI

- OpenAI ダッシュボードでAPI使用量を監視
- Usage Limits を設定（月額予算超過を防止）

---

## 🔧 トラブルシューティング

### エラー: "Failed to fetch"

**原因**: CORS設定またはEdge Function認証エラー

**解決策**:
1. Edge Functionsが正しくデプロイされているか確認
2. `Authorization` ヘッダーが `session.access_token` を使用しているか確認

### エラー: "Row Level Security policy violation"

**原因**: RLSポリシーが不足している

**解決策**:
```sql
-- 該当テーブルのポリシーを確認
SELECT * FROM rls_policies WHERE tablename = 'テーブル名';

-- ポリシーが不足していれば追加
```

### エラー: "Invalid API Key"

**原因**: OpenAI API Keyが正しく設定されていない

**解決策**:
```bash
# Secretsを再設定
supabase secrets set OPENAI_API_KEY=sk-prod-xxxxx

# Edge Functionを再デプロイ
supabase functions deploy chat-gpt
```

---

## 📞 サポート

問題が発生した場合:

1. **Supabase**: https://supabase.com/docs
2. **Vercel**: https://vercel.com/docs
3. **OpenAI**: https://platform.openai.com/docs

---

## ✅ 最終チェックリスト

本番運用開始前に以下を確認:

- [ ] RLS が全テーブルで有効
- [ ] Edge Functions がデプロイ済み
- [ ] 環境変数が正しく設定（Vercel + Supabase）
- [ ] テストデータを削除
- [ ] hCaptcha 有効化
- [ ] バックアップ設定確認
- [ ] 動作確認テスト完了
- [ ] エラー監視ツール設定（Sentry等）
- [ ] 運用マニュアル作成
- [ ] スタッフトレーニング実施

**すべて✅になったら本番運用開始可能です！**
