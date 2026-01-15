/*
  # 年額価格とトライアル期間の修正

  ## 修正内容
  1. 年額価格を正しい値に修正
    - Starter年額: ¥42,980 → ¥42,000（月額換算: ¥3,500）
    - Standard年額: ¥107,784 → ¥107,000（月額換算: ¥8,917）
  
  2. トライアル期間を30日から14日に変更
*/

-- 年額プランの価格を修正
UPDATE subscription_plans 
SET 
  price = 42000,
  monthly_equivalent_price = 3500,
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'annual';

UPDATE subscription_plans 
SET 
  price = 107000,
  monthly_equivalent_price = 8917,
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';

-- 既存のトライアルサブスクリプションの期間を14日に修正
UPDATE organization_subscriptions
SET 
  current_period_end = started_at + interval '14 days',
  trial_end = started_at + interval '14 days',
  updated_at = now()
WHERE status = 'trial' 
AND current_period_end > now();
