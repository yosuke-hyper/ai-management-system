/*
  # 機能ベース3プラン制への移行

  ## 変更内容

  ### 料金体系の変更
  - 旧: 店舗数ベース（1店舗あたり3,980円/月）
  - 新: 機能ベース3プラン制
    - Starter: 3,980円/月（小規模個人店向け）
    - Standard: 7,980円/月（小規模チェーン向け）
    - Premium: 12,800円/月（中規模チェーン向け）

  ### プラン定義の更新
  1. **Starter プラン**
     - 月額: 3,980円（変更なし）
     - 年額: 42,000円（月額換算: 3,500円、約12%割引）
     - AI利用: 50回/月（旧: 90回 → 新仕様に合わせて削減）
     - 推奨店舗数: 1店舗（個人店向け）
     - 主な機能: 基本ダッシュボード、日報入力、AIチャット（制限あり）、月次AIレポート

  2. **Standard プラン**
     - 月額: 7,980円（旧: 9,980円 → 値下げ）
     - 年額: 85,776円（月額換算: 7,148円、約10%割引）
     - AI利用: 300回/月（変更なし）
     - 推奨店舗数: 1〜5店舗（小規模チェーン向け）
     - 主な機能: Starterの全機能 + 店舗比較、詳細権限管理、週次レポート

  3. **Premium プラン（新規追加）**
     - 月額: 12,800円
     - 年額: 138,240円（月額換算: 11,520円、約10%割引）
     - AI利用: 2,000回/月
     - 推奨店舗数: 5〜20店舗（中規模チェーン向け）
     - 主な機能: Standardの全機能 + 本部管理、エリア別分析、予測機能、優先サポート

  ## 重要な変更点

  - **max_stores は「推奨値」に**: 料金計算には使用せず、プラン選択時の目安として残す
  - **contracted_stores は「参考値」に**: 料金計算から切り離し、将来の拡張のために保持
  - **店舗数と料金の切り離し**: 1店舗でもPremiumプランを選択可能、20店舗でもStarterを選択可能

  ## 既存ユーザーへの影響

  - 既存のサブスクリプションは自動的には変更されません
  - 次回更新時に新料金体系が適用されます
  - Standard利用中で価格が下がるユーザーには値下げが適用されます
*/

-- ====================================
-- 1. 既存プランの価格・制限値を更新
-- ====================================

-- Starter 月額プラン: AI利用を50回/月に削減、機能説明を更新
UPDATE subscription_plans
SET
  price = 3980,
  monthly_equivalent_price = 3980,
  max_stores = 1,
  max_users = 5,
  ai_usage_limit = 50,
  features = jsonb_build_array(
    '基本ダッシュボード（日次/週次/月次）',
    '日報入力と自動計算（売上・原価・人件費 → 粗利・原価率）',
    '月次経費管理（固定費・変動費）',
    '目標設定と達成度表示',
    'AIチャット分析（月50回まで）',
    'AI月次レポート（月2回）',
    'POSデータインポート',
    'CSV/Excelエクスポート'
  ),
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'monthly';

-- Starter 年額プラン: AI利用を50回/月に削減
UPDATE subscription_plans
SET
  price = 42000,
  monthly_equivalent_price = 3500,
  max_stores = 1,
  max_users = 5,
  ai_usage_limit = 50,
  features = jsonb_build_array(
    '基本ダッシュボード（日次/週次/月次）',
    '日報入力と自動計算（売上・原価・人件費 → 粗利・原価率）',
    '月次経費管理（固定費・変動費）',
    '目標設定と達成度表示',
    'AIチャット分析（月50回まで）',
    'AI月次レポート（月2回）',
    'POSデータインポート',
    'CSV/Excelエクスポート',
    '年払いで約12%割引'
  ),
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'annual';

-- Standard 月額プラン: 価格を7,980円に値下げ、推奨店舗数を拡大
UPDATE subscription_plans
SET
  price = 7980,
  monthly_equivalent_price = 7980,
  max_stores = 5,
  max_users = 25,
  ai_usage_limit = 300,
  features = jsonb_build_array(
    'Starterの全機能',
    '店舗横断比較（売上・利益率・原価率）',
    '詳細な権限管理（オーナー/管理者/店長/スタッフ）',
    'AIチャット分析（月300回まで）',
    'AI週次レポート（週1回、月4回）',
    'Googleスプレッドシート連携',
    'メール通知・アラート機能',
    '1〜5店舗の管理に最適'
  ),
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'monthly';

-- Standard 年額プラン: 価格を85,776円に値下げ（月額換算7,148円、約10%割引）
UPDATE subscription_plans
SET
  price = 85776,
  monthly_equivalent_price = 7148,
  max_stores = 5,
  max_users = 25,
  ai_usage_limit = 300,
  features = jsonb_build_array(
    'Starterの全機能',
    '店舗横断比較（売上・利益率・原価率）',
    '詳細な権限管理（オーナー/管理者/店長/スタッフ）',
    'AIチャット分析（月300回まで）',
    'AI週次レポート（週1回、月4回）',
    'Googleスプレッドシート連携',
    'メール通知・アラート機能',
    '1〜5店舗の管理に最適',
    '年払いで約10%割引'
  ),
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';

-- ====================================
-- 2. Premium プランの追加
-- ====================================

-- Premium 月額プラン: 12,800円/月
INSERT INTO subscription_plans (
  name,
  display_name,
  billing_cycle,
  price,
  monthly_equivalent_price,
  max_stores,
  max_users,
  ai_usage_limit,
  features,
  is_active
) VALUES (
  'premium',
  'Premium',
  'monthly',
  12800,
  12800,
  20,
  100,
  2000,
  jsonb_build_array(
    'Standardの全機能',
    '本部・多店舗管理機能',
    '全店舗統合ダッシュボード',
    'エリア別・ブランド別KPI分析',
    '異常値検知アラート',
    '売上・利益予測（AI予測機能）',
    'AIチャット分析（月2,000回まで）',
    'AI日次レポート（毎日自動生成）',
    '高度な外部連携API',
    '優先サポート（専任担当者）',
    '5〜20店舗の管理に最適'
  ),
  true
) ON CONFLICT (name, billing_cycle) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  monthly_equivalent_price = EXCLUDED.monthly_equivalent_price,
  max_stores = EXCLUDED.max_stores,
  max_users = EXCLUDED.max_users,
  ai_usage_limit = EXCLUDED.ai_usage_limit,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Premium 年額プラン: 138,240円/年（月額換算11,520円、約10%割引）
INSERT INTO subscription_plans (
  name,
  display_name,
  billing_cycle,
  price,
  monthly_equivalent_price,
  max_stores,
  max_users,
  ai_usage_limit,
  features,
  is_active
) VALUES (
  'premium',
  'Premium',
  'annual',
  138240,
  11520,
  20,
  100,
  2000,
  jsonb_build_array(
    'Standardの全機能',
    '本部・多店舗管理機能',
    '全店舗統合ダッシュボード',
    'エリア別・ブランド別KPI分析',
    '異常値検知アラート',
    '売上・利益予測（AI予測機能）',
    'AIチャット分析（月2,000回まで）',
    'AI日次レポート（毎日自動生成）',
    '高度な外部連携API',
    '優先サポート（専任担当者）',
    '5〜20店舗の管理に最適',
    '年払いで約10%割引'
  ),
  true
) ON CONFLICT (name, billing_cycle) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  monthly_equivalent_price = EXCLUDED.monthly_equivalent_price,
  max_stores = EXCLUDED.max_stores,
  max_users = EXCLUDED.max_users,
  ai_usage_limit = EXCLUDED.ai_usage_limit,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ====================================
-- 3. テーブルへのコメント追加
-- ====================================

COMMENT ON COLUMN subscription_plans.max_stores IS '推奨最大店舗数（料金計算には使用しない。プラン選択時の目安として表示）';
COMMENT ON COLUMN subscription_plans.max_users IS '最大ユーザー数（契約店舗数に応じて動的に計算される場合もある）';
COMMENT ON COLUMN subscription_plans.ai_usage_limit IS 'AI利用回数の月次上限（チャット+レポート生成の合計）';
COMMENT ON COLUMN organization_subscriptions.contracted_stores IS '契約時の店舗数（参考値。料金は plan_id により固定金額）';

-- ====================================
-- 4. 確認用ビュー（オプション）
-- ====================================

-- プラン一覧を見やすく表示するビュー
CREATE OR REPLACE VIEW v_subscription_plans_summary AS
SELECT
  name,
  display_name,
  billing_cycle,
  price,
  monthly_equivalent_price,
  CASE
    WHEN billing_cycle = 'monthly' THEN price::text || '円/月'
    WHEN billing_cycle = 'annual' THEN price::text || '円/年 (月額換算: ' || monthly_equivalent_price::text || '円)'
  END as price_display,
  max_stores as recommended_max_stores,
  max_users,
  ai_usage_limit,
  is_active
FROM subscription_plans
ORDER BY
  CASE name
    WHEN 'starter' THEN 1
    WHEN 'standard' THEN 2
    WHEN 'premium' THEN 3
  END,
  CASE billing_cycle
    WHEN 'monthly' THEN 1
    WHEN 'annual' THEN 2
  END;

-- コメント追加
COMMENT ON VIEW v_subscription_plans_summary IS '料金プラン一覧（機能ベース3プラン制）';
