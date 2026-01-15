/*
  # サブスクリプションプランシステムの作成

  ## 1. 新しいテーブル
  
  ### `subscription_plans`
  - `id` (uuid, primary key) - プランID
  - `name` (text) - プラン名（starter, standard）
  - `display_name` (text) - 表示名
  - `billing_cycle` (text) - 請求サイクル（monthly, annual）
  - `price` (integer) - 価格（円）
  - `monthly_equivalent_price` (integer) - 月額換算価格
  - `max_stores` (integer) - 最大店舗数
  - `max_users` (integer) - 最大ユーザー数
  - `ai_usage_limit` (integer) - AI利用回数/月
  - `features` (jsonb) - 機能リスト
  - `is_active` (boolean) - 有効/無効
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `organization_subscriptions`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key) - 組織ID
  - `plan_id` (uuid, foreign key) - プランID
  - `status` (text) - ステータス（active, cancelled, expired, trial）
  - `started_at` (timestamptz) - 開始日
  - `current_period_end` (timestamptz) - 現在の期間終了日
  - `trial_end` (timestamptz) - トライアル終了日（nullable）
  - `cancelled_at` (timestamptz) - キャンセル日（nullable）
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. セキュリティ
  - 両テーブルでRLSを有効化
  - 組織オーナー/管理者のみがサブスクリプション情報を閲覧可能
  - プラン情報は全認証ユーザーが閲覧可能

  ## 3. 初期データ
  - Starterプラン（月額・年額）
  - Standardプラン（月額・年額）
*/

-- subscription_plans テーブル作成
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  price integer NOT NULL,
  monthly_equivalent_price integer NOT NULL,
  max_stores integer NOT NULL,
  max_users integer NOT NULL,
  ai_usage_limit integer NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, billing_cycle)
);

-- organization_subscriptions テーブル作成
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at timestamptz DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  trial_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);

-- RLS有効化
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- subscription_plans のRLSポリシー（全認証ユーザーが閲覧可能）
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON subscription_plans;
CREATE POLICY "Authenticated users can view active plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- organization_subscriptions のRLSポリシー
DROP POLICY IF EXISTS "Organization members can view subscription" ON organization_subscriptions;
CREATE POLICY "Organization members can view subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;
CREATE POLICY "Organization owners can manage subscription"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- 初期プランデータの投入
INSERT INTO subscription_plans (name, display_name, billing_cycle, price, monthly_equivalent_price, max_stores, max_users, ai_usage_limit, features) VALUES
  -- Starter 月額
  ('starter', 'Starter', 'monthly', 3980, 3980, 2, 5, 120, 
   '["ダッシュボード（日次/週次/月次）", "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算", "月次経費管理（家賃・消耗品などの固定/変動費）", "目標設定＆達成度バッジ（数字の見える化で全員経営）", "AIチャット分析（例：改善提案、原価率の異常検知のヒント）", "AI自動レポート：月2回（仮）"]'::jsonb),
  
  -- Starter 年額（10%割引適用）
  ('starter', 'Starter', 'annual', 42000, 3500, 2, 5, 120,
   '["ダッシュボード（日次/週次/月次）", "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算", "月次経費管理（家賃・消耗品などの固定/変動費）", "目標設定＆達成度バッジ（数字の見える化で全員経営）", "AIチャット分析（例：改善提案、原価率の異常検知のヒント）", "AI自動レポート：月2回（仮）", "年払いで10%割引"]'::jsonb),

  -- Standard 月額
  ('standard', 'Standard', 'monthly', 9980, 9980, 3, 12, 300,
   '["Starterの全機能", "店舗横断比較（売上・粗利・原価率・人件費率など）", "詳細な権限管理（管理者/店長/スタッフ）", "Googleスプレッドシート連携（実績の自動集計/共有）", "AI自動レポート：週次（最大4回/月）", "AIチャット上限拡大：300回/月"]'::jsonb),

  -- Standard 年額（10%割引適用）
  ('standard', 'Standard', 'annual', 107000, 8917, 3, 12, 300,
   '["Starterの全機能", "店舗横断比較（売上・粗利・原価率・人件費率など）", "詳細な権限管理（管理者/店長/スタッフ）", "Googleスプレッドシート連携（実績の自動集計/共有）", "AI自動レポート：週次（最大4回/月）", "AIチャット上限拡大：300回/月", "年払いで10%割引"]'::jsonb)
ON CONFLICT (name, billing_cycle) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  monthly_equivalent_price = EXCLUDED.monthly_equivalent_price,
  max_stores = EXCLUDED.max_stores,
  max_users = EXCLUDED.max_users,
  ai_usage_limit = EXCLUDED.ai_usage_limit,
  features = EXCLUDED.features,
  updated_at = now();

-- 既存組織にデフォルトでStarter月額プランを割り当て（トライアル期間14日）
INSERT INTO organization_subscriptions (organization_id, plan_id, status, started_at, current_period_end, trial_end)
SELECT
  o.id,
  (SELECT id FROM subscription_plans WHERE name = 'starter' AND billing_cycle = 'monthly' LIMIT 1),
  'trial',
  now(),
  now() + interval '14 days',
  now() + interval '14 days'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_subscriptions
  WHERE organization_subscriptions.organization_id = o.id
);
