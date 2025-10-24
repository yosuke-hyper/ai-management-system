# 本番環境セットアップ・デプロイガイド

このドキュメントでは、AI経営管理システムを本番環境にデプロイする手順を説明します。

## 目次
1. [事前準備](#事前準備)
2. [Supabase本番環境のセットアップ](#supabase本番環境のセットアップ)
3. [環境変数の設定](#環境変数の設定)
4. [デプロイ（Vercel）](#デプロイvercel)
5. [デプロイ（Netlify）](#デプロイnetlify)
6. [デプロイ後の確認](#デプロイ後の確認)
7. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 必要なアカウント
- [ ] Supabaseアカウント（https://supabase.com）
- [ ] Vercel または Netlifyアカウント
- [ ] OpenAI アカウント（https://platform.openai.com）
- [ ] Google Cloudアカウント（Sheets連携を使用する場合）
- [ ] GitHubアカウント（推奨）

### 必要な情報
- [ ] ドメイン名（任意、カスタムドメインを使用する場合）
- [ ] 組織情報（利用規約・プライバシーポリシーに記載）
- [ ] サポートメールアドレス

---

## Supabase本番環境のセットアップ

### 1. 新しいプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 「New Project」をクリック
3. 以下の情報を入力:
   - **Name**: `ai-management-production` (任意)
   - **Database Password**: 強力なパスワードを生成して保存
   - **Region**: `Northeast Asia (Tokyo)` を推奨
   - **Pricing Plan**: 用途に応じて選択（Free/Pro/Team）

4. 「Create new project」をクリック

⚠️ **重要**: データベースパスワードは必ず安全に保管してください。

### 2. データベースマイグレーションの実行

#### 方法1: Supabase CLI（推奨）

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your_project_ref

# マイグレーションを実行
supabase db push
```

#### 方法2: SQL Editorから手動実行

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/` フォルダ内の各SQLファイルを、ファイル名の日付順に実行
3. エラーがないことを確認

**実行順序**:
```
20250929190518_proud_sunset.sql
20250929190524_nameless_summit.sql
20250929190531_heavy_manor.sql
20250929190539_emerald_torch.sql
20250929211836_amber_wildflower.sql
20251003040424_add_store_insert_policies.sql
20251003040825_fix_profiles_insert_policy.sql
20251003040841_create_missing_profiles.sql
20251003064153_create_daily_report_vendor_purchases.sql
20251003161608_create_base_schema.sql
20251004034606_fix_targets_rls_policies.sql
20251004171555_create_expense_baselines.sql
20251004173303_add_rent_and_consumables_to_expenses.sql
20251005051705_add_performance_indexes.sql
20251005052656_create_ai_chat_archive_schema.sql
20251006042332_enforce_complete_rls_policies_v2.sql
20251006054119_create_is_admin_and_complete_rls.sql
20251006061737_add_profiles_insert_policy.sql
20251006081854_create_expense_baselines_table.sql
20251006114143_create_auto_profile_trigger.sql
20251007025748_add_missing_columns_to_expense_baselines.sql
20251007062248_fix_store_vendor_assignments_rls.sql
20251008121020_add_cost_rate_targets_to_targets.sql
20251009033828_add_daily_targets_table.sql
20251009044215_create_ai_report_system_tables.sql
20251009050405_add_ai_reports_delete_policy.sql
20251009115151_add_shareable_link_to_reports.sql
20251009115807_add_ai_reports_update_policies.sql
20251009120056_fix_ai_reports_policies_conflict.sql
20251009130000_create_ai_usage_limits.sql
20251009163131_20251009130000_create_ai_usage_limits.sql
20251010052354_create_organizations_multitenant.sql
20251010052538_add_organization_id_to_all_tables.sql
20251010052634_update_rls_policies_multitenant.sql
20251010053119_migrate_existing_data_to_default_org.sql
20251010053407_fix_infinite_recursion_rls_policies.sql
20251010053454_simplify_all_rls_policies.sql
20251010053854_clean_duplicate_profiles_policies.sql
20251010054359_fix_profiles_select_policy.sql
20251010060428_fix_organization_members_infinite_recursion.sql
20251010060736_fix_profiles_infinite_recursion_final.sql
20251010164216_create_organization_on_profile_creation.sql
20251010164335_update_organization_creation_use_metadata.sql
20251010181327_create_audit_logs_table.sql
20251011012111_add_terms_acceptance_tracking.sql
add_terms_acceptance_tracking.sql (最新)
```

### 3. Edge Functionsのデプロイ

```bash
# 各Edge Functionをデプロイ
supabase functions deploy chat-gpt
supabase functions deploy generate-ai-report
supabase functions deploy scheduled-report-generator
supabase functions deploy send-report-email
supabase functions deploy sync-to-sheets
```

または、Supabase Dashboardから手動でデプロイ:
1. Dashboard → Edge Functions
2. 「Deploy new function」
3. 各関数のコードをコピー&ペースト

### 4. 認証設定の確認

1. Supabase Dashboard → Authentication → Settings
2. 以下を確認:
   - **Site URL**: デプロイ後のURL（例: `https://your-app.vercel.app`）
   - **Redirect URLs**: `https://your-app.vercel.app/**` を追加
   - **Email Auth**: 有効化
   - **Confirm Email**: 必要に応じて有効化（推奨: 本番では有効）

### 5. RLS（Row Level Security）の確認

すべてのテーブルでRLSが有効になっていることを確認:

```sql
-- SQL Editorで実行
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%';
```

すべてのテーブルで `rowsecurity` が `true` であることを確認。

### 6. APIキーの取得

1. Dashboard → Settings → API
2. 以下をコピーして保存:
   - **Project URL**: `VITE_SUPABASE_URL` に使用
   - **anon/public key**: `VITE_SUPABASE_ANON_KEY` に使用
   - **service_role key**: Edge Functionsで自動利用（手動設定不要）

---

## 環境変数の設定

### 1. 本番用環境変数ファイルの作成

プロジェクトルートに `.env.production` ファイルを作成:

```bash
# Application Mode
VITE_DEMO_MODE=false

# Supabase Configuration (本番)
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Sheets Integration (オプション)
VITE_GOOGLE_SHEETS_API_KEY=your_google_api_key
VITE_GOOGLE_SHEET_ID=your_sheet_id

# OpenAI API Configuration
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Production
NODE_ENV=production
```

### 2. OpenAI APIキーの取得

1. [OpenAI Platform](https://platform.openai.com) にログイン
2. API Keys → Create new secret key
3. キーをコピーして `.env.production` に設定
4. 使用量制限を設定（Settings → Limits）推奨: $50/月程度

### 3. Google Sheets API設定（オプション）

Google Sheetsへの自動同期を使用する場合:

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成
3. Google Sheets API を有効化
4. 認証情報 → APIキー を作成
5. サービスアカウントを作成し、JSONキーをダウンロード
6. 対象のGoogle Sheetにサービスアカウントのメールアドレスを編集者として追加

### 4. Edge Functions環境変数の設定

Supabase Dashboardで設定:

1. Dashboard → Edge Functions → Settings
2. 以下の環境変数を追加:
   - `OPENAI_API_KEY`: OpenAIのAPIキー

**重要**: Edge Functionsでは `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` は自動的に利用可能です。

---

## デプロイ（Vercel）

### 前提条件
- GitHubにコードをプッシュ済み
- Vercelアカウント作成済み

### デプロイ手順

#### 1. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 「Add New」→「Project」をクリック
3. GitHubリポジトリをインポート
4. プロジェクト名を設定（例: `ai-management-system`）

#### 2. ビルド設定

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 3. 環境変数の設定

「Environment Variables」セクションで以下を追加:

```
VITE_DEMO_MODE=false
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
NODE_ENV=production
```

**注意**: すべての環境変数を「Production」、「Preview」、「Development」にチェック

#### 4. デプロイ実行

「Deploy」ボタンをクリック

#### 5. カスタムドメインの設定（オプション）

1. デプロイ完了後、プロジェクト設定 → Domains
2. カスタムドメインを追加
3. DNSレコードを設定:
   - Aレコード: VercelのIPアドレス
   - または CNAMEレコード: `cname.vercel-dns.com`

#### 6. Supabaseの認証設定を更新

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL** と **Redirect URLs** を Vercel URLに更新:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`

---

## デプロイ（Netlify）

### 前提条件
- GitHubにコードをプッシュ済み
- Netlifyアカウント作成済み

### デプロイ手順

#### 1. Netlifyプロジェクトの作成

1. [Netlify Dashboard](https://app.netlify.com) にログイン
2. 「Add new site」→「Import an existing project」
3. GitHubリポジトリを選択

#### 2. ビルド設定

- **Build command**: `npm run build`
- **Publish directory**: `dist`

#### 3. 環境変数の設定

「Site settings」→「Environment variables」で追加:

```
VITE_DEMO_MODE=false
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
NODE_ENV=production
```

#### 4. リダイレクト設定

プロジェクトルートに `netlify.toml` を作成:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 5. デプロイ実行

「Deploy site」ボタンをクリック

#### 6. カスタムドメインの設定（オプション）

1. 「Domain settings」
2. 「Add custom domain」
3. DNSレコードを設定

#### 7. Supabaseの認証設定を更新

Vercelと同様に、Site URLとRedirect URLsを更新

---

## デプロイ後の確認

### 1. 基本動作確認

- [ ] サイトにアクセスできる
- [ ] ログイン画面が表示される
- [ ] 新規ユーザー登録ができる
- [ ] ログインができる
- [ ] 利用規約同意モーダルが表示される

### 2. 認証フロー確認

- [ ] ログインできる
- [ ] ログアウトできる
- [ ] セッションが維持される
- [ ] パスワードリセットが機能する（メール確認有効時）

### 3. データベース動作確認

- [ ] 店舗データの作成・表示
- [ ] 日報の作成・表示
- [ ] ユーザー権限による表示制御
- [ ] RLSが正しく機能している

### 4. AI機能確認

- [ ] AIチャットが動作する
- [ ] AIレポート生成が動作する
- [ ] 使用量制限が機能している

### 5. パフォーマンス確認

- [ ] ページ読み込み速度（3秒以内推奨）
- [ ] 画像・アセット読み込み
- [ ] モバイル表示

### 6. セキュリティ確認

- [ ] HTTPSで接続される
- [ ] APIキーがクライアントに露出していない（開発者ツールで確認）
- [ ] 不正なアクセスが拒否される
- [ ] CORS設定が正しい

---

## トラブルシューティング

### 問題: ビルドが失敗する

**原因**: 環境変数が設定されていない

**解決策**:
1. すべての必須環境変数が設定されているか確認
2. ビルドログを確認してエラーメッセージを特定
3. `npm run build` をローカルで実行してエラーを再現

### 問題: ログインできない

**原因**: Supabaseの認証URLが正しく設定されていない

**解決策**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URLとRedirect URLsがデプロイ先URLと一致しているか確認
3. ブラウザのコンソールでエラーを確認

### 問題: データが表示されない

**原因**: RLSポリシーまたは組織設定の問題

**解決策**:
1. Supabase SQL Editorでクエリを直接実行して確認
2. ユーザーが組織に所属しているか確認
3. RLSポリシーが正しく設定されているか確認

### 問題: Edge Functionsが動作しない

**原因**: 環境変数の設定漏れ

**解決策**:
1. Supabase Dashboard → Edge Functions → Settings
2. `OPENAI_API_KEY` が設定されているか確認
3. 関数のログを確認（Dashboard → Edge Functions → Logs）

### 問題: 404エラーが発生する

**原因**: SPAのルーティング設定が不足

**解決策**:

**Vercel**: `vercel.json` を作成:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Netlify**: `netlify.toml` を確認

### 問題: パフォーマンスが遅い

**解決策**:
1. Supabase Dashboard → Database → Query Performance を確認
2. 不足しているインデックスを追加
3. 大量データの場合はページネーション実装
4. 画像最適化（未使用の場合）

---

## セキュリティチェックリスト

デプロイ前に必ず確認:

- [ ] すべてのテーブルでRLSが有効
- [ ] `service_role_key` がクライアントコードに含まれていない
- [ ] OpenAI APIキーの使用量制限を設定済み
- [ ] Supabaseプロジェクトのパスワードが強固
- [ ] HTTPSのみでアクセス可能
- [ ] 認証のリダイレクトURLが正しく制限されている
- [ ] CORS設定が適切

---

## 次のステップ

デプロイが完了したら:

1. **初期データ投入**: 店舗、ユーザー、業者情報を登録
2. **ユーザートレーニング**: 操作方法を説明
3. **監視設定**: エラートラッキング（Sentry等）を設定
4. **バックアップ確認**: 自動バックアップが動作しているか確認
5. **ドキュメント更新**: 運用マニュアルを作成

---

## サポート

問題が発生した場合:
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com

このドキュメントについての質問や改善提案があれば、開発チームにお問い合わせください。
