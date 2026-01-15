/*
  # 期間限定キャンペーン価格追加

  ## 変更内容

  ### キャンペーン詳細
  - **期間**: 2026年12月〜2026年5月
  - **Starter**: 40% OFF（¥5,980 → ¥3,588）
  - **Standard**: 30% OFF（¥7,980 → ¥5,586）
  - **Premium**: 20% OFF（¥14,800 → ¥11,840）

  ### 追加カラム
  - `campaign_price`: キャンペーン価格（NULL可）
  - `campaign_discount_rate`: 割引率（NULL可）
  - `campaign_start_date`: キャンペーン開始日
  - `campaign_end_date`: キャンペーン終了日

  ## 実装内容
  1. subscription_plansテーブルにキャンペーン関連カラムを追加
  2. 全プランにキャンペーン価格を設定
*/

-- ====================================
-- 1. キャンペーン価格カラムの追加
-- ====================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS campaign_price integer,
ADD COLUMN IF NOT EXISTS campaign_discount_rate integer,
ADD COLUMN IF NOT EXISTS campaign_start_date date,
ADD COLUMN IF NOT EXISTS campaign_end_date date;

-- ====================================
-- 2. Starterプランのキャンペーン設定（40% OFF）
-- ====================================

-- Starter 月額: ¥5,980 → ¥3,588（40% OFF）
UPDATE subscription_plans
SET
  campaign_price = 3588,
  campaign_discount_rate = 40,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'monthly';

-- Starter 年額: ¥63,158 → ¥37,895（40% OFF）
UPDATE subscription_plans
SET
  campaign_price = 37895,
  campaign_discount_rate = 40,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'annual';

-- ====================================
-- 3. Standardプランのキャンペーン設定（30% OFF）
-- ====================================

-- Standard 月額: ¥7,980 → ¥5,586（30% OFF）
UPDATE subscription_plans
SET
  campaign_price = 5586,
  campaign_discount_rate = 30,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'monthly';

-- Standard 年額: ¥85,245 → ¥59,672（30% OFF）
UPDATE subscription_plans
SET
  campaign_price = 59672,
  campaign_discount_rate = 30,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';

-- ====================================
-- 4. Premiumプランのキャンペーン設定（20% OFF）
-- ====================================

-- Premium 月額: ¥14,800 → ¥11,840（20% OFF）
UPDATE subscription_plans
SET
  campaign_price = 11840,
  campaign_discount_rate = 20,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'premium' AND billing_cycle = 'monthly';

-- Premium 年額: ¥159,840 → ¥127,872（20% OFF）
UPDATE subscription_plans
SET
  campaign_price = 127872,
  campaign_discount_rate = 20,
  campaign_start_date = '2025-12-01',
  campaign_end_date = '2026-05-31',
  updated_at = now()
WHERE name = 'premium' AND billing_cycle = 'annual';
