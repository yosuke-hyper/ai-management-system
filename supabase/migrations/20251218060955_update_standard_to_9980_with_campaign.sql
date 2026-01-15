/*
  # Standardプラン価格改定（¥9,980）とキャンペーン適用

  ## 変更内容

  ### 価格改定
  - **Standard 月額**: ¥7,980 → ¥9,980（+¥2,000）
  - **Standard 年額**: ¥85,245 → ¥109,780（月額×11ヶ月）

  ### キャンペーン価格（30% OFF）
  - **Standard 月額**: ¥9,980 → ¥6,986（30%割引）
  - **Standard 年額**: ¥109,780 → ¥76,846（30%割引）
  - **キャンペーン期間**: 2025年12月1日 〜 2026年5月31日

  ## 戦略的位置づけ
  - 本格的な多店舗管理機能とAI分析機能の価値に見合う価格設定
  - 年払いで月額換算¥9,162（約8%割引）
  - キャンペーン適用で実質¥6,986/月（通常価格の70%）

  ## 変更対象
  1. Standard プラン（月額）- ベース価格とキャンペーン価格
  2. Standard プラン（年額）- ベース価格とキャンペーン価格
*/

-- ====================================
-- 1. Standard 月額プランの価格改定
-- ====================================

-- ベース価格: ¥7,980 → ¥9,980
-- キャンペーン価格: ¥6,986（30% OFF）
UPDATE subscription_plans
SET
  price = 9980,
  monthly_equivalent_price = 9980,
  campaign_price = 6986,
  campaign_discount_rate = 30,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'monthly';

-- ====================================
-- 2. Standard 年額プランの価格改定
-- ====================================

-- ベース価格: ¥85,245 → ¥109,780（月額×11ヶ月）
-- 月額換算: ¥9,162（約8%割引）
-- キャンペーン価格: ¥76,846（30% OFF）
-- キャンペーン時の月額換算: ¥6,404（約36%割引）
UPDATE subscription_plans
SET
  price = 109780,
  monthly_equivalent_price = 9162,
  campaign_price = 76846,
  campaign_discount_rate = 30,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';

-- ====================================
-- 3. 変更内容の確認
-- ====================================

-- Standard プランの価格を確認
DO $$
DECLARE
  monthly_plan RECORD;
  annual_plan RECORD;
BEGIN
  -- 月額プランを取得
  SELECT * INTO monthly_plan
  FROM subscription_plans
  WHERE name = 'standard' AND billing_cycle = 'monthly';

  -- 年額プランを取得
  SELECT * INTO annual_plan
  FROM subscription_plans
  WHERE name = 'standard' AND billing_cycle = 'annual';

  -- 結果をログ出力
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Standard プラン価格改定完了';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '【月額プラン】';
  RAISE NOTICE 'ベース価格: ¥%', monthly_plan.price;
  RAISE NOTICE 'キャンペーン価格: ¥%（%％ OFF）', monthly_plan.campaign_price, monthly_plan.campaign_discount_rate;
  RAISE NOTICE 'キャンペーン期間: % 〜 %', monthly_plan.campaign_start_date, monthly_plan.campaign_end_date;
  RAISE NOTICE '';
  RAISE NOTICE '【年額プラン】';
  RAISE NOTICE 'ベース価格: ¥%（月額換算 ¥%）', annual_plan.price, annual_plan.monthly_equivalent_price;
  RAISE NOTICE 'キャンペーン価格: ¥%（%％ OFF）', annual_plan.campaign_price, annual_plan.campaign_discount_rate;
  RAISE NOTICE 'キャンペーン時の月額換算: ¥%', ROUND(annual_plan.campaign_price::numeric / 12);
  RAISE NOTICE 'キャンペーン期間: % 〜 %', annual_plan.campaign_start_date, annual_plan.campaign_end_date;
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;
