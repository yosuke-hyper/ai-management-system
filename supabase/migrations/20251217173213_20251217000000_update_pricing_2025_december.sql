/*
  # 2025年12月価格改定

  ## 変更内容

  ### 価格改定
  - **Starter:** ¥3,980 → ¥5,980（+¥2,000、+50.3%）
  - **Standard:** ¥5,980 → ¥7,980（+¥2,000、+33.4%）
  - **Premium:** ¥12,800 → ¥14,800（+¥2,000、+15.6%）

  ### 戦略的位置づけ
  1. **全プラン一律値上げ**: 各プランに¥2,000の値上げを適用
  2. **価格差の維持**: Starter-Standard間、Standard-Premium間の差額を均等化
  3. **年払い割引**: 既存の約10〜12%割引を維持

  ### 年額の計算
  - Starter年額: ¥5,980 × 12 × 0.88 = ¥63,158（月額換算¥5,263）
  - Standard年額: ¥7,980 × 12 × 0.89 = ¥85,245（月額換算¥7,104）
  - Premium年額: ¥14,800 × 12 × 0.90 = ¥159,840（月額換算¥13,320）

  ## 変更対象
  1. Starter プラン（月額・年額）
  2. Standard プラン（月額・年額）
  3. Premium プラン（月額・年額）
*/

-- ====================================
-- 1. Starter プランの価格改定
-- ====================================

-- Starter 月額プラン: ¥3,980 → ¥5,980
UPDATE subscription_plans
SET
  price = 5980,
  monthly_equivalent_price = 5980,
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

-- Starter 年額プラン: ¥42,000 → ¥63,158（月額換算¥5,263、約12%割引）
UPDATE subscription_plans
SET
  price = 63158,
  monthly_equivalent_price = 5263,
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

-- ====================================
-- 2. Standard プランの価格改定
-- ====================================

-- Standard 月額プラン: ¥5,980 → ¥7,980
UPDATE subscription_plans
SET
  price = 7980,
  monthly_equivalent_price = 7980,
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

-- Standard 年額プラン: ¥63,760 → ¥85,245（月額換算¥7,104、約11%割引）
UPDATE subscription_plans
SET
  price = 85245,
  monthly_equivalent_price = 7104,
  features = jsonb_build_array(
    'Starterの全機能',
    '店舗横断比較（売上・利益率・原価率）',
    '詳細な権限管理（オーナー/管理者/店長/スタッフ）',
    'AIチャット分析（月300回まで）',
    'AI週次レポート（週1回、月4回）',
    'Googleスプレッドシート連携',
    'メール通知・アラート機能',
    '1〜5店舗の管理に最適',
    '年払いで約11%割引'
  ),
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';

-- ====================================
-- 3. Premium プランの価格改定
-- ====================================

-- Premium 月額プラン: ¥12,800 → ¥14,800
UPDATE subscription_plans
SET
  price = 14800,
  monthly_equivalent_price = 14800,
  features = jsonb_build_array(
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
  updated_at = now()
WHERE name = 'premium' AND billing_cycle = 'monthly';

-- Premium 年額プラン: ¥138,240 → ¥159,840（月額換算¥13,320、約10%割引）
UPDATE subscription_plans
SET
  price = 159840,
  monthly_equivalent_price = 13320,
  features = jsonb_build_array(
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
  updated_at = now()
WHERE name = 'premium' AND billing_cycle = 'annual';
