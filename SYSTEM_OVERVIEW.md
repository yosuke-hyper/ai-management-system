# システム全体概要ドキュメント

## プロジェクト情報

**プロジェクト名:** AI Management System
**バージョン:** 0.0.0
**タイプ:** 飲食チェーン向け経営管理システム（マルチテナント対応）
**ディレクトリパス:** `/tmp/cc-agent/57978924/project`

---

## 1. 技術スタック

### フロントエンド
- **React** 18.3.1 - UIフレームワーク
- **TypeScript** 5.5.3 - 型安全な開発
- **Vite** 5.4.2 - 高速ビルドツール
- **React Router DOM** 6.28.0 - クライアントサイドルーティング
- **Tailwind CSS** 3.4.1 - ユーティリティファーストCSS

### UI・デザイン
- **Radix UI** - アクセシブルなUIコンポーネント
  - Dropdown Menu, Progress, Slot, Tabs
- **Lucide React** 0.544.0 - アイコンライブラリ
- **Class Variance Authority** - 条件付きスタイリング
- **clsx / tailwind-merge** - クラス名結合

### データ可視化
- **Chart.js** 4.5.0 + **react-chartjs-2** 5.3.0
- **Recharts** 3.2.0
- **TanStack React Table** 8.20.5 - 高機能テーブル

### バックエンド・インフラ
- **Supabase** - BaaS (Backend as a Service)
  - 認証 (Email/Password)
  - PostgreSQL データベース
  - Row Level Security (RLS)
  - Edge Functions (Deno)
  - リアルタイム機能
- **Supabase Client** 2.39.3

### 外部API連携
- **OpenAI API** - AI分析レポート生成、チャット機能
- **Google Sheets API** - データ同期・エクスポート
- **LINE Messaging API** - LINE Bot（未実装）

### ユーティリティ
- **date-fns** 4.1.0 - 日付操作
- **Terser** 5.44.0 - コード圧縮

---

## 2. プロジェクト構造

```
project/
├── src/                          # フロントエンドソースコード
│   ├── components/               # UIコンポーネント (68ファイル)
│   │   ├── Admin/               # 管理者機能
│   │   ├── Auth/                # 認証UI
│   │   ├── Charts/              # グラフコンポーネント
│   │   ├── Chat/                # AIチャット
│   │   ├── Dashboard/           # ダッシュボード
│   │   ├── Organization/        # 組織管理
│   │   ├── Reports/             # レポート管理
│   │   ├── Stores/              # 店舗管理
│   │   ├── Tables/              # テーブル表示
│   │   ├── Usage/               # 使用量管理
│   │   ├── alerts/              # アラート機能
│   │   ├── analysis/            # 分析機能
│   │   ├── auth/                # 認証コンポーネント
│   │   ├── charts/              # チャート詳細
│   │   ├── data/                # データテーブル
│   │   ├── layout/              # レイアウト
│   │   ├── system/              # システム機能
│   │   └── ui/                  # 再利用可能なUI部品
│   ├── contexts/                # React Context (4ファイル)
│   │   ├── AdminDataContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── OrganizationContext.tsx
│   │   └── StoreContext.tsx
│   ├── hooks/                   # カスタムフック (10ファイル)
│   │   ├── useAIReports.ts
│   │   ├── useAIUsageLimit.ts
│   │   ├── useChatArchive.ts
│   │   ├── useDailyTarget.ts
│   │   ├── useExpenseBaseline.ts
│   │   ├── useKpis.ts
│   │   ├── useReports.ts
│   │   ├── useStores.ts
│   │   ├── useTargets.ts
│   │   └── useUsageLimits.ts
│   ├── layout/                  # レイアウトコンポーネント (3ファイル)
│   │   ├── Header.tsx
│   │   ├── MainLayout.tsx
│   │   └── Sidebar.tsx
│   ├── lib/                     # ユーティリティライブラリ (6ファイル)
│   │   ├── errorMessages.ts     # エラーメッセージ定義
│   │   ├── format.ts            # フォーマット関数
│   │   ├── mock.ts              # モックデータ
│   │   ├── organizationHelper.ts # 組織ヘルパー
│   │   ├── supabase.ts          # Supabaseクライアント
│   │   └── utils.ts             # 汎用ユーティリティ
│   ├── pages/                   # ページコンポーネント (14ファイル)
│   │   ├── AIChatPage.tsx
│   │   ├── AIReportsPage.tsx
│   │   ├── AdminSettings.tsx
│   │   ├── DashboardDaily.tsx
│   │   ├── DashboardMonthly.tsx
│   │   ├── DashboardWeekly.tsx
│   │   ├── InvitationAccept.tsx
│   │   ├── MonthlyExpenseForm.tsx
│   │   ├── OrganizationSettings.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   ├── ReportForm.tsx
│   │   ├── SharedReport.tsx
│   │   ├── StaffManagement.tsx
│   │   ├── Targets.tsx
│   │   └── TermsOfService.tsx
│   ├── services/                # ビジネスロジック・API (8ファイル)
│   │   ├── api.ts               # API統合
│   │   ├── auditLog.ts          # 監査ログ
│   │   ├── chatArchive.ts       # チャット履歴
│   │   ├── googleSheets.ts      # Google Sheets連携
│   │   ├── organizationService.ts # 組織管理
│   │   ├── sampleData.ts        # サンプルデータ
│   │   ├── supabase.ts          # Supabase操作
│   │   └── usageLimits.ts       # 使用制限管理
│   ├── types/                   # TypeScript型定義 (1ファイル)
│   │   └── index.ts             # 全型定義
│   ├── utils/                   # 計算ロジック (1ファイル)
│   │   └── calculations.ts      # KPI計算等
│   ├── App.tsx                  # ルートコンポーネント
│   ├── main.tsx                 # エントリーポイント
│   └── index.css                # グローバルスタイル
│
├── supabase/                    # Supabaseバックエンド
│   ├── functions/               # Edge Functions (5個)
│   │   ├── chat-gpt/           # ChatGPT API統合
│   │   ├── generate-ai-report/ # AI分析レポート生成
│   │   ├── scheduled-report-generator/ # スケジュールレポート
│   │   ├── send-report-email/  # レポートメール送信
│   │   └── sync-to-sheets/     # Google Sheets同期
│   └── migrations/              # データベースマイグレーション (53ファイル)
│       └── *.sql                # DDL/DML (合計7,254行)
│
├── api/                         # Python API (未使用・レガシー)
│   └── main.py
│
├── scripts/                     # 運用スクリプト
│   └── verify-production.sh    # 本番検証スクリプト
│
├── public/                      # 静的ファイル
├── dist/                        # ビルド出力
│
├── .env                         # 環境変数 (開発用)
├── .env.example                 # 環境変数テンプレート
├── .env.production.example      # 本番環境変数テンプレート
│
├── package.json                 # 依存関係定義
├── tsconfig.json                # TypeScript設定
├── vite.config.ts               # Vite設定
├── tailwind.config.js           # Tailwind CSS設定
├── postcss.config.js            # PostCSS設定
├── eslint.config.js             # ESLint設定
│
└── ドキュメント/ (16ファイル)
    ├── README.md                        # プロジェクト概要
    ├── MULTITENANT_ARCHITECTURE.md      # マルチテナント設計
    ├── PRODUCTION_DEPLOY.md             # デプロイ手順
    ├── DEPLOYMENT_CHECKLIST.md          # デプロイチェックリスト
    ├── PRODUCTION_DEPLOYMENT.md         # 本番デプロイ詳細
    ├── QUICK_START_DEPLOYMENT.md        # クイックスタート
    ├── PRODUCTION_READINESS_REPORT.md   # 本番準備レポート
    ├── PRODUCTION_BLOCKER_FIXES.md      # 本番阻害要因対応
    ├── CRITICAL_FIXES_APPLIED.md        # 重要修正履歴
    ├── DEMO_TO_PRODUCTION_GUIDE.md      # デモ→本番移行ガイド
    ├── PRODUCTION_SETUP_SQL.md          # 本番SQL設定
    ├── SYSTEM_VERIFICATION.md           # システム検証
    ├── OPENAI_SETUP.md                  # OpenAI API設定
    ├── CHATGPT_SETUP.md                 # ChatGPT設定
    ├── GOOGLE_SHEETS_SETUP.md           # Google Sheets設定
    └── EXPORT_PROJECT.md                # プロジェクトエクスポート
```

**統計:**
- TypeScript/TSXファイル: 122個
- Supabaseマイグレーション: 53ファイル (7,254行)
- Edge Functions: 5個

---

## 3. 主要機能

### 3.1 認証・権限管理
- **Supabase Auth** による Email/Password 認証
- **マルチテナント対応** (組織ごとに完全データ分離)
- **役割ベース権限管理**
  - `Owner`: 組織オーナー (全権限)
  - `Admin`: 管理者 (メンバー管理、設定変更)
  - `Manager`: 店長 (店舗データ管理)
  - `Staff`: スタッフ (日報入力のみ)
- **Row Level Security (RLS)** による自動データフィルタリング

### 3.2 店舗・組織管理
- **マルチストア対応** (複数店舗管理)
- **組織管理**
  - 組織情報設定
  - メンバー招待・削除
  - サブスクリプションプラン管理
- **店舗管理**
  - 店舗登録・編集・削除
  - 店長アサイン
  - 店舗別権限設定

### 3.3 日報・レポート管理
- **日次報告入力**
  - 売上 (現金/クレジット、税率別)
  - 仕入れ (仕入先別)
  - 各種経費 (人件費、水光熱費、賃料、消耗品等)
  - テキスト報告
- **月次経費入力**
  - 固定費の月次入力
- **仕入先管理**
  - カテゴリ別仕入先登録
  - 店舗別仕入先アサイン

### 3.4 ダッシュボード・分析
- **3つの期間別ダッシュボード**
  - 日次ダッシュボード
  - 週次ダッシュボード
  - 月次ダッシュボード
- **KPI表示**
  - 売上高
  - 粗利益・粗利率
  - 営業利益・営業利益率
  - 原価率
  - 人件費率
  - 目標達成率
- **グラフ・チャート**
  - 売上推移 (棒グラフ)
  - 経費比率 (円グラフ)
  - 利益ウォーターフォール
  - カレンダーヒートマップ
- **店舗比較機能**
  - 店舗間パフォーマンス比較

### 3.5 目標管理
- **月次目標設定**
  - 目標売上
  - 目標利益
  - 目標利益率
  - 目標原価率
  - 目標人件費率
- **日次目標設定**
  - 日別売上目標
- **目標達成状況の可視化**
  - 達成率表示
  - 進捗バッジ

### 3.6 AI機能
- **AIチャット**
  - 店舗データに基づく質問応答
  - 過去のチャット履歴保存
  - 使用量制限管理
- **AI分析レポート自動生成**
  - 週次・月次レポート自動作成
  - スケジュール設定
  - レポート共有機能 (公開URL)
  - メール送信機能
- **AI使用量管理**
  - 組織ごとの月次制限
  - 使用量トラッキング
  - 使用量警告・制限

### 3.7 Google Sheets連携
- **データ同期**
  - 日報データのGoogle Sheets出力
  - リアルタイム同期設定
- **双方向連携**
  - Sheets → DB インポート
  - DB → Sheets エクスポート

### 3.8 監査・セキュリティ
- **監査ログ**
  - 全ての重要操作をログ記録
  - ユーザー、タイムスタンプ、アクション記録
- **利用規約・プライバシーポリシー**
  - 利用規約同意管理
  - 同意履歴トラッキング

---

## 4. データベース設計

### 4.1 主要テーブル (27個)

#### 組織・ユーザー管理
1. **`organizations`** - 組織情報
2. **`organization_members`** - 組織メンバー関連
3. **`profiles`** - ユーザープロファイル
4. **`organization_invitations`** - 組織招待

#### 店舗管理
5. **`stores`** - 店舗マスタ
6. **`store_assignments`** - ユーザー・店舗アサイン
7. **`vendors`** - 仕入先マスタ
8. **`store_vendor_assignments`** - 店舗・仕入先関連

#### レポート・データ
9. **`daily_reports`** - 日報
10. **`daily_report_vendor_purchases`** - 日報仕入先別データ
11. **`monthly_expenses`** - 月次経費
12. **`summary_data`** - サマリーデータ

#### 目標管理
13. **`targets`** - 月次目標
14. **`daily_targets`** - 日次目標
15. **`expense_baselines`** - 経費ベースライン

#### AI機能
16. **`ai_conversations`** - AIチャット会話
17. **`ai_messages`** - AIメッセージ
18. **`ai_generated_reports`** - AI生成レポート
19. **`report_schedules`** - レポートスケジュール
20. **`ai_usage_settings`** - AI使用量設定
21. **`ai_usage_tracking`** - AI使用量トラッキング
22. **`report_generation_logs`** - レポート生成ログ

#### システム
23. **`audit_logs`** - 監査ログ
24. **`terms_acceptance`** - 利用規約同意

### 4.2 セキュリティ (RLS)

**全テーブルでRow Level Security有効化**

- **組織間完全データ分離**
  - `organization_id` による自動フィルタリング
  - ヘルパー関数で現在ユーザーの組織ID取得
- **役割ベースアクセス制御**
  - SELECT/INSERT/UPDATE/DELETE ポリシー個別定義
  - 管理者権限チェック関数
- **セキュアデフォルト設計**
  - デフォルトで全アクセス拒否
  - 必要な権限のみ明示的に許可

### 4.3 ヘルパー関数

```sql
-- ユーザーの組織ID取得
get_user_organization_id() -> uuid

-- 組織オーナー判定
is_organization_owner(org_id uuid) -> boolean

-- 組織管理者判定
is_organization_admin(org_id uuid) -> boolean

-- 管理者権限判定 (profiles.role)
is_admin() -> boolean
```

---

## 5. Supabase Edge Functions

### 5.1 `chat-gpt`
- **機能:** ChatGPT APIとの統合
- **エンドポイント:** `/functions/v1/chat-gpt`
- **入力:** ユーザーメッセージ、会話履歴
- **出力:** AI応答
- **認証:** 必要 (JWT検証)

### 5.2 `generate-ai-report`
- **機能:** AI分析レポート自動生成
- **エンドポイント:** `/functions/v1/generate-ai-report`
- **入力:** 店舗ID、期間、レポートタイプ
- **出力:** 生成されたレポート (JSON)
- **処理:**
  1. データベースから該当期間のデータ取得
  2. OpenAI API でレポート生成
  3. `ai_generated_reports` に保存

### 5.3 `scheduled-report-generator`
- **機能:** スケジュール設定に基づくレポート自動生成
- **トリガー:** Cron (Supabase Scheduler)
- **処理:**
  1. `report_schedules` から実行対象を取得
  2. `generate-ai-report` を呼び出し
  3. 生成結果をログに記録

### 5.4 `send-report-email`
- **機能:** 生成されたレポートのメール送信
- **エンドポイント:** `/functions/v1/send-report-email`
- **入力:** レポートID、送信先メールアドレス
- **出力:** 送信ステータス

### 5.5 `sync-to-sheets`
- **機能:** データをGoogle Sheetsに同期
- **エンドポイント:** `/functions/v1/sync-to-sheets`
- **入力:** 店舗ID、期間
- **処理:**
  1. 日報データ取得
  2. Google Sheets API で書き込み

**共通仕様:**
- **CORS対応:** 全てのEdge Functionで必須ヘッダー設定
- **エラーハンドリング:** try-catchでラップ
- **環境変数:** 自動注入 (SUPABASE_URL, SUPABASE_ANON_KEY等)

---

## 6. 環境変数

### 開発環境 (`.env`)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# モード切り替え
VITE_USE_SUPABASE=false  # false=デモモード、true=本番モード

# OpenAI (Edge Functions用、フロントエンド不要)
OPENAI_API_KEY=sk-...

# Google Sheets (オプション)
VITE_GOOGLE_SHEETS_API_KEY=your-api-key
VITE_GOOGLE_SHEET_ID=your-sheet-id

# LINE Bot (未実装)
LINE_CHANNEL_SECRET=your-secret
LINE_CHANNEL_ACCESS_TOKEN=your-token
```

### 本番環境 (`.env.production`)
```bash
# Supabase (本番)
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key

# 本番モード必須
VITE_USE_SUPABASE=true

# その他API設定
OPENAI_API_KEY=sk-prod-...
VITE_GOOGLE_SHEETS_API_KEY=prod-api-key
VITE_GOOGLE_SHEET_ID=prod-sheet-id
```

**セキュリティ注意:**
- サービスロールキーは **絶対にフロントエンドに含めない**
- Edge Functions内でのみ使用
- `.env` ファイルは `.gitignore` に含める

---

## 7. ルーティング構造

### 公開ページ (認証不要)
- `/login` - ログインページ
- `/share/report/:shareToken` - 共有レポート
- `/invite/:token` - 組織招待受諾
- `/terms` - 利用規約
- `/privacy` - プライバシーポリシー

### 認証済みページ (AuthGate)
- `/` → `/dashboard/daily` (リダイレクト)
- `/dashboard/daily` - 日次ダッシュボード
- `/dashboard/weekly` - 週次ダッシュボード
- `/dashboard/monthly` - 月次ダッシュボード
- `/targets` - 目標設定
- `/chat` - AIチャット
- `/ai-reports` - AI分析レポート一覧
- `/report/new` - 新規日報作成
- `/report` - 日報編集
- `/expenses/monthly` - 月次経費入力
- `/staff` - スタッフ管理 (管理者のみ)
- `/admin` - 管理者設定 (管理者のみ)
- `/organization` - 組織設定 (Owner/Adminのみ)

### 特殊ルート
- `/auth/callback` - 認証コールバック (Supabase)

---

## 8. 開発・ビルド・デプロイ

### 開発コマンド
```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (ポート5173)
npm run dev

# 本番ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

### ビルド設定
- **バンドラー:** Vite
- **コード圧縮:** Terser (console.log除去)
- **コード分割:**
  - `react-vendor` (React, React DOM, React Router)
  - `chart-vendor` (Chart.js, Recharts)
  - `ui-vendor` (Radix UI, Lucide React)
- **警告閾値:** 1000KB

### デプロイ方法

#### 1. Netlify (推奨)
```bash
# netlify.toml 設定済み
# GitHub連携で自動デプロイ
```

#### 2. Vercel
```bash
# vercel.json 設定済み
# Vercel CLI または GitHub連携
vercel --prod
```

#### 3. 手動デプロイ
```bash
npm run build
# dist/ フォルダを任意のホスティングサービスにアップロード
```

### Supabase設定
1. **プロジェクト作成:** Supabase Dashboard
2. **マイグレーション実行:**
   ```bash
   # Supabase CLI (ローカル)
   supabase db push

   # または SQL Editorで手動実行
   ```
3. **Edge Functions デプロイ:**
   ```bash
   # MCP Toolを使用 (このプロジェクトの場合)
   # または Supabase CLI
   supabase functions deploy chat-gpt
   supabase functions deploy generate-ai-report
   supabase functions deploy scheduled-report-generator
   supabase functions deploy send-report-email
   supabase functions deploy sync-to-sheets
   ```
4. **環境変数設定:**
   - Supabase Dashboard → Settings → Secrets
   - `OPENAI_API_KEY` 等を設定

---

## 9. データフロー

### 9.1 日報入力フロー
```
[スタッフ] → ReportForm.tsx
    ↓
[データ検証] → TypeScript型チェック
    ↓
[Supabase Insert] → daily_reports テーブル
    ↓ (RLS自動フィルタ: organization_id)
[保存成功] → ダッシュボードに反映
    ↓
[オプション] → Google Sheets同期 (sync-to-sheets)
```

### 9.2 AIチャットフロー
```
[ユーザー] → AIChatPage.tsx → AIChat.tsx
    ↓
[使用量チェック] → useAIUsageLimit.ts
    ↓ (制限OK)
[Edge Function] → chat-gpt (Supabase Function)
    ↓
[OpenAI API] → ChatGPT-4 (gpt-4-turbo)
    ↓
[応答取得] → ai_messages テーブルに保存
    ↓
[UI更新] → チャット画面に表示
    ↓
[使用量記録] → ai_usage_tracking に記録
```

### 9.3 AI分析レポート生成フロー
```
[管理者] → GenerateReportDialog.tsx
    ↓
[パラメータ入力] → 店舗、期間、レポートタイプ
    ↓
[Edge Function] → generate-ai-report
    ↓
[データ取得] → daily_reports, targets 等
    ↓
[OpenAI API] → レポート文章生成
    ↓
[保存] → ai_generated_reports テーブル
    ↓
[共有URL生成] → share_token 発行
    ↓
[メール送信] → send-report-email (オプション)
```

### 9.4 スケジュールレポート生成フロー
```
[Cron Trigger] → Supabase Scheduler
    ↓
[Edge Function] → scheduled-report-generator
    ↓
[スケジュール取得] → report_schedules (enabled=true)
    ↓
[各レポート生成] → generate-ai-report 呼び出し
    ↓
[ログ記録] → report_generation_logs
    ↓
[メール送信] → send-report-email
```

---

## 10. 状態管理

### 10.1 React Context
1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - 認証状態管理
   - ユーザー情報
   - ログイン/ログアウト

2. **OrganizationContext** (`src/contexts/OrganizationContext.tsx`)
   - 現在の組織情報
   - 組織メンバー一覧
   - 組織切り替え (将来対応)

3. **StoreContext** (`src/contexts/StoreContext.tsx`)
   - 現在選択中の店舗
   - ユーザーがアクセス可能な店舗一覧

4. **AdminDataContext** (`src/contexts/AdminDataContext.tsx`)
   - 管理者用データキャッシュ
   - 店舗一覧、ユーザー一覧等

### 10.2 カスタムフック
- `useAIReports` - AI生成レポート管理
- `useAIUsageLimit` - AI使用量制限チェック
- `useChatArchive` - チャット履歴管理
- `useDailyTarget` - 日次目標取得・更新
- `useExpenseBaseline` - 経費ベースライン
- `useKpis` - KPI計算
- `useReports` - 日報データ取得
- `useStores` - 店舗データ管理
- `useTargets` - 目標データ管理
- `useUsageLimits` - 使用量制限管理

---

## 11. セキュリティ対策

### 11.1 認証・認可
- ✅ Supabase Auth (Email/Password)
- ✅ JWT トークンベース認証
- ✅ Row Level Security (RLS) による自動フィルタリング
- ✅ 役割ベースアクセス制御 (RBAC)
- ✅ AuthGate コンポーネントによる保護

### 11.2 データ保護
- ✅ 組織間完全データ分離 (organization_id)
- ✅ SQL Injection 対策 (Supabase ORM)
- ✅ XSS 対策 (React のデフォルト保護)
- ✅ CSRF 対策 (JWT トークン検証)

### 11.3 API セキュリティ
- ✅ Edge Functions での JWT 検証
- ✅ CORS ヘッダー設定
- ✅ Rate Limiting (使用量制限)
- ✅ 環境変数による秘密鍵管理

### 11.4 監査
- ✅ 監査ログ記録 (audit_logs)
- ✅ 利用規約同意管理 (terms_acceptance)
- ✅ AI 使用量トラッキング

### 11.5 未実装・推奨対策
- ⚠️ Two-Factor Authentication (2FA)
- ⚠️ パスワード複雑度ポリシー
- ⚠️ IP制限・Geo-Blocking
- ⚠️ HTTPS 証明書 (デプロイ環境依存)
- ⚠️ WAF (Web Application Firewall)

---

## 12. パフォーマンス最適化

### 12.1 フロントエンド
- ✅ コード分割 (react-vendor, chart-vendor, ui-vendor)
- ✅ 遅延読み込み (React.lazy - 未実装)
- ✅ Terser による圧縮・最適化
- ✅ Tree Shaking (Vite)
- ✅ CSS-in-JS 最適化 (Tailwind CSS)

### 12.2 データベース
- ✅ インデックス作成 (organization_id, store_id, date等)
- ✅ 複合インデックス (パフォーマンス向上)
- ✅ パーティショニング (未実装 - 大規模時検討)

### 12.3 API
- ✅ Edge Functions (低レイテンシ)
- ✅ データキャッシング (React Query未使用 - 検討余地)
- ⚠️ レスポンス圧縮 (Gzip/Brotli - ホスティング依存)

### 12.4 チャート・UI
- ✅ Chart.js / Recharts による効率的レンダリング
- ⚠️ 仮想スクロール (大量データ表示時 - TanStack Table対応可)

---

## 13. テスト戦略 (未実装)

### 推奨テスト構成
```
tests/
├── unit/                # ユニットテスト
│   ├── utils/          # 計算ロジック
│   ├── services/       # API呼び出し
│   └── hooks/          # カスタムフック
├── integration/         # 統合テスト
│   └── api/            # Edge Functions
├── e2e/                # E2Eテスト
│   ├── auth.spec.ts    # 認証フロー
│   ├── report.spec.ts  # 日報入力
│   └── dashboard.spec.ts # ダッシュボード
└── fixtures/            # テストデータ
```

### 推奨ツール
- **ユニット/統合:** Vitest
- **E2E:** Playwright / Cypress
- **カバレッジ:** Istanbul (c8)

---

## 14. 今後の拡張計画

### 14.1 短期 (1-3ヶ月)
- [ ] LINE Bot 実装 (日報のLINE入力)
- [ ] モバイルアプリ (React Native / PWA)
- [ ] リアルタイム通知機能
- [ ] データエクスポート (CSV/Excel)
- [ ] テスト実装 (Unit/E2E)

### 14.2 中期 (3-6ヶ月)
- [ ] 在庫管理機能
- [ ] シフト管理機能
- [ ] 請求書管理
- [ ] Stripe統合 (サブスクリプション決済)
- [ ] 多言語対応 (i18n)

### 14.3 長期 (6ヶ月以上)
- [ ] 予測分析 (AI売上予測)
- [ ] 複数組織切り替え機能
- [ ] サードパーティ連携 (POS、会計ソフト等)
- [ ] ホワイトラベル対応
- [ ] オンプレミス版提供

---

## 15. トラブルシューティング

### よくある問題と解決策

#### 1. 認証エラー: "Invalid token"
**原因:** JWT トークン期限切れ、または不正なトークン
**解決:**
```typescript
// 強制ログアウト → 再ログイン
await supabase.auth.signOut()
```

#### 2. RLS エラー: "new row violates row-level security policy"
**原因:** organization_id が NULL、または権限不足
**解決:**
```sql
-- organization_id を自動設定するトリガー確認
SELECT * FROM pg_trigger WHERE tgname LIKE '%org%';

-- 手動設定
UPDATE profiles SET organization_id = 'your-org-id' WHERE id = 'user-id';
```

#### 3. Edge Function エラー: "Function not found"
**原因:** Edge Function が未デプロイ
**解決:**
```bash
supabase functions deploy chat-gpt
```

#### 4. ビルドエラー: "Module not found"
**原因:** 依存関係の不足
**解決:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 5. データが表示されない
**原因:** デモモード/本番モード設定ミス
**解決:**
```bash
# .env ファイル確認
VITE_USE_SUPABASE=true  # 本番データを使用
VITE_USE_SUPABASE=false # モックデータを使用
```

---

## 16. 監視・メトリクス

### 推奨監視項目
1. **システム稼働率**
   - Uptime (99.9% 目標)
   - レスポンスタイム (<200ms)

2. **ユーザーメトリクス**
   - DAU/MAU (Daily/Monthly Active Users)
   - セッション時間
   - 離脱率

3. **ビジネスメトリクス**
   - 日報入力率
   - AI使用率
   - レポート生成回数
   - サブスクリプション継続率

4. **エラー監視**
   - エラー発生率
   - 500エラー件数
   - 認証失敗回数

### 推奨ツール
- **Sentry** - エラートラッキング
- **Google Analytics / Mixpanel** - ユーザー行動分析
- **Supabase Dashboard** - データベース監視
- **Vercel/Netlify Analytics** - デプロイ監視

---

## 17. ライセンス・利用規約

### プロジェクトライセンス
- **Private** (非公開プロジェクト)
- 商用利用可能 (組織内)

### 使用ライブラリライセンス
- **React, React Router:** MIT License
- **Supabase:** Apache 2.0 License
- **Tailwind CSS:** MIT License
- **Chart.js, Recharts:** MIT License
- **Radix UI:** MIT License
- **Lucide React:** ISC License

### サービス利用規約
- `/terms` - 利用規約ページ
- `/privacy` - プライバシーポリシーページ
- ユーザー同意管理 (`terms_acceptance` テーブル)

---

## 18. 連絡先・サポート

### 開発チーム
- **プロジェクト管理者:** (未設定)
- **技術リード:** (未設定)

### サポートチャネル
- **メール:** support@example.com (未設定)
- **Slack/Discord:** (未設定)
- **GitHub Issues:** (未設定)

### ドキュメント
- **本ファイル:** `SYSTEM_OVERVIEW.md`
- **マルチテナント設計:** `MULTITENANT_ARCHITECTURE.md`
- **デプロイガイド:** `PRODUCTION_DEPLOY.md`
- **API設定:** `OPENAI_SETUP.md`, `GOOGLE_SHEETS_SETUP.md`

---

## 19. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-24 | 1.0.0 | 初版作成 - システム全体概要ドキュメント |

---

## 付録

### A. TypeScript 主要型定義

```typescript
// 組織
interface Organization {
  id: string
  name: string
  slug: string
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled'
  subscriptionPlan: 'free' | 'starter' | 'business' | 'enterprise'
  maxStores: number
  maxUsers: number
  maxAiRequestsPerMonth: number
}

// ユーザー
interface User {
  id: string
  email: string
  role: 'staff' | 'manager' | 'admin'
  organizationId: string
}

// 日報
interface DailyReport {
  id: string
  date: string
  storeId: string
  sales: number
  purchase: number
  laborCost: number
  utilities: number
  rent: number
  // ... 他の経費項目
  reportText: string
}

// KPI
interface KpiData {
  totalSales: number
  grossProfit: number
  grossProfitMargin: number
  operatingProfit: number
  operatingProfitMargin: number
  costRate: number
  laborRate: number
}
```

### B. 環境変数一覧

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `VITE_SUPABASE_URL` | ✅ | Supabase プロジェクトURL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名キー | `eyJhbGciOi...` |
| `VITE_USE_SUPABASE` | ✅ | 本番/デモモード | `true` / `false` |
| `OPENAI_API_KEY` | 🔶 | OpenAI APIキー (Edge Functions) | `sk-proj-...` |
| `VITE_GOOGLE_SHEETS_API_KEY` | ⚪ | Google Sheets APIキー | `AIza...` |
| `VITE_GOOGLE_SHEET_ID` | ⚪ | Google Sheet ID | `1Abc...` |
| `LINE_CHANNEL_SECRET` | ⚪ | LINE チャネルシークレット | `xxx` |
| `LINE_CHANNEL_ACCESS_TOKEN` | ⚪ | LINE アクセストークン | `xxx` |

✅ 必須 / 🔶 AI機能に必須 / ⚪ オプション

---

**このドキュメントは、プロジェクト全体の理解と運用を支援するために作成されました。**
**質問・フィードバックは開発チームまでお願いします。**
