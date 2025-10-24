# マルチテナント化アーキテクチャ

## 概要

このシステムは、複数の企業・組織が完全に独立してデータを管理できるマルチテナントアーキテクチャに対応しています。

## データベース構造

### 新規テーブル

#### 1. `organizations` テーブル
組織・企業の基本情報を管理します。

```sql
- id (uuid): 組織ID
- name (text): 組織名
- slug (text): URL用スラッグ（一意）
- email (text): 連絡先メール
- phone (text): 電話番号
- subscription_status (text): trial | active | suspended | cancelled
- subscription_plan (text): free | starter | business | enterprise
- trial_ends_at (timestamptz): トライアル期限
- max_stores (int): 最大店舗数制限
- max_users (int): 最大ユーザー数制限
- max_ai_requests_per_month (int): 月間AI使用回数制限
- settings (jsonb): 組織固有の設定
- created_at, updated_at (timestamptz)
```

#### 2. `organization_members` テーブル
組織とユーザーの関連を管理します。

```sql
- organization_id (uuid): 組織ID
- user_id (uuid): ユーザーID
- role (text): owner | admin | member
- joined_at (timestamptz): 参加日時
```

**役割の説明：**
- `owner`: 組織のオーナー（最上位権限、組織削除可能）
- `admin`: 管理者（メンバー管理、設定変更可能）
- `member`: 一般メンバー（データ閲覧・入力）

### 既存テーブルの変更

全ての既存テーブルに `organization_id` カラムを追加しました：

- profiles
- stores
- store_assignments
- vendors
- store_vendor_assignments
- daily_reports
- daily_report_vendor_purchases
- monthly_expenses
- targets
- daily_targets
- expense_baselines
- ai_conversations
- ai_messages
- ai_generated_reports
- report_schedules
- ai_usage_settings
- ai_usage_tracking
- report_generation_logs
- summary_data

## セキュリティ（RLS: Row Level Security）

### データ分離の原則

1. **完全な組織間データ分離**
   - ユーザーは自分の所属組織のデータのみアクセス可能
   - 他の組織のデータは一切見えない・変更できない

2. **全テーブルでRLS有効化**
   - 全てのクエリで `organization_id` による自動フィルタリング
   - アプリケーション層のバグがあってもデータ漏洩を防止

3. **役割ベースのアクセス制御**
   - `owner`: 全権限（組織削除含む）
   - `admin`: メンバー管理、設定変更、データ編集
   - `member`: データ閲覧・入力（自分の担当店舗のみ）

### ヘルパー関数

```sql
-- ユーザーの所属組織IDを取得
get_user_organization_id() -> uuid

-- ユーザーが組織のオーナーかどうか判定
is_organization_owner(org_id uuid DEFAULT NULL) -> boolean

-- ユーザーが組織の管理者以上かどうか判定
is_organization_admin(org_id uuid DEFAULT NULL) -> boolean
```

## サブスクリプションプラン

### プラン種別

| プラン | 店舗数 | ユーザー数 | AI使用回数/月 | 価格（想定） |
|--------|--------|------------|---------------|-------------|
| Free | 1 | 3 | 50 | 無料 |
| Starter | 3 | 5 | 100 | ¥9,800/月 |
| Business | 10 | 20 | 500 | ¥29,800/月 |
| Enterprise | 無制限 | 無制限 | 無制限 | 要相談 |

### サブスクリプション状態

- `trial`: トライアル期間中（デフォルト14日間）
- `active`: 有効な契約
- `suspended`: 一時停止（支払い失敗等）
- `cancelled`: キャンセル済み（データ保持期間あり）

## 実装状況

### ✅ 完了項目

1. **データベーススキーマ**
   - [x] `organizations` テーブル作成
   - [x] `organization_members` テーブル作成
   - [x] 全テーブルへの `organization_id` 追加
   - [x] インデックス作成
   - [x] ヘルパー関数作成

2. **セキュリティ**
   - [x] 全テーブルのRLSポリシー更新
   - [x] 組織間データ分離の実装
   - [x] 役割ベースアクセス制御

### 🚧 未実装項目（次のステップ）

1. **TypeScript型定義の更新**
   - [ ] Organization型の追加
   - [ ] 既存型への organization_id 追加

2. **React Context/Hooks**
   - [ ] OrganizationContext の作成
   - [ ] useOrganization フック
   - [ ] 組織切り替え機能（将来の複数組織対応用）

3. **認証フロー**
   - [ ] サインアップ時の組織自動作成
   - [ ] プロファイル作成時の organization_members 追加
   - [ ] 組織選択UI（将来用）

4. **組織管理UI**
   - [ ] 組織設定ページ
   - [ ] メンバー管理画面
   - [ ] サブスクリプション管理
   - [ ] 招待リンク機能

5. **データ移行**
   - [ ] 既存データへのデフォルト組織割り当て
   - [ ] 既存ユーザーの organization_members への追加

6. **Stripe統合**
   - [ ] サブスクリプション契約
   - [ ] 自動請求
   - [ ] プラン変更
   - [ ] 使用量制限の実装

## データ移行手順（既存データがある場合）

```sql
-- 1. デフォルト組織を作成
INSERT INTO organizations (name, slug, email, subscription_status, subscription_plan)
VALUES ('デフォルト組織', 'default-org', 'admin@example.com', 'active', 'enterprise');

-- 2. 全てのテーブルの organization_id を設定
UPDATE profiles SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org');
UPDATE stores SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org');
UPDATE daily_reports SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org');
-- ... (他のテーブルも同様)

-- 3. 既存ユーザーを organization_members に追加
INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  (SELECT id FROM organizations WHERE slug = 'default-org'),
  id,
  CASE
    WHEN role = 'admin' THEN 'owner'
    ELSE 'member'
  END
FROM profiles;

-- 4. NOT NULL制約を追加（全データ移行後）
ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE stores ALTER COLUMN organization_id SET NOT NULL;
-- ... (他のテーブルも同様)
```

## API変更（今後必要）

### 既存APIの更新

全てのデータ取得・更新APIで `organization_id` を自動的に設定・フィルタリングします。

```typescript
// Before
const { data } = await supabase.from('stores').select('*')

// After (自動的に organization_id でフィルタリングされる)
const { data } = await supabase.from('stores').select('*')
// RLSにより自動的に WHERE organization_id = current_user_org_id が追加される
```

### 新規API

```typescript
// 組織情報取得
GET /api/organization

// 組織更新
PATCH /api/organization

// メンバー一覧
GET /api/organization/members

// メンバー招待
POST /api/organization/members/invite

// メンバー削除
DELETE /api/organization/members/:userId

// サブスクリプション情報
GET /api/organization/subscription
```

## テスト計画

### 1. データ分離テスト

```sql
-- 組織Aのユーザーとして
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM stores; -- 組織Aのstoresのみ返却されることを確認

-- 組織Bのユーザーとして
SET request.jwt.claim.sub = 'user-b-id';
SELECT * FROM stores; -- 組織Bのstoresのみ返却されることを確認
```

### 2. 権限テスト

- Memberが管理者機能にアクセスできないことを確認
- Adminがメンバー管理できることを確認
- Ownerのみが組織削除できることを確認

### 3. パフォーマンステスト

- 1000組織、各組織100店舗でのクエリ速度確認
- インデックスの有効性確認

## モニタリング

### 監視すべき指標

1. **組織数の推移**
2. **アクティブユーザー数（組織別）**
3. **ストレージ使用量（組織別）**
4. **API呼び出し回数（組織別）**
5. **AI使用回数（組織別）**
6. **サブスクリプション状態の分布**

## トラブルシューティング

### よくある問題

1. **organization_id が NULL のデータ**
   - 原因: データ移行が不完全
   - 解決: 上記のデータ移行手順を実行

2. **ユーザーがデータにアクセスできない**
   - 原因: organization_members に登録されていない
   - 解決: organization_members にレコードを追加

3. **パフォーマンス低下**
   - 原因: インデックスの不足
   - 解決: EXPLAIN ANALYZE でクエリを分析し、必要に応じてインデックス追加

## 参考資料

- [Supabase Multi-Tenancy Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#multi-tenancy)
- [PostgreSQL RLS Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SaaS Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
