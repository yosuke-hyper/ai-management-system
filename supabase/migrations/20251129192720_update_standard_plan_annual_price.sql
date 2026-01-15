/*
  # Standardプラン年額料金の変更

  ## 概要
  Standardプランの年額料金を85,776円から84,980円に変更します。

  ## 変更内容
  1. subscription_plansテーブルのStandardプラン（年払い）の料金を更新
     - 変更前: 85,776円
     - 変更後: 84,980円
     - 月額換算: 7,082円（年間10,780円の割引）

  ## 影響
  - 既存のStandardプラン年払い顧客には影響なし（契約時の価格が適用される）
  - 新規契約から新価格が適用される
*/

-- Standardプランの年額料金を更新
UPDATE subscription_plans
SET 
  price = 84980,
  monthly_equivalent_price = 7082,
  updated_at = now()
WHERE name = 'standard' 
  AND billing_cycle = 'annual';