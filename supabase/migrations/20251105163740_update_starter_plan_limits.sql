/*
  # Starter プラン制限の更新

  ## 変更内容
  
  Starterプラン（月額3,980円）の制限を以下のように変更：
  - 店舗数: 2店舗 → 1店舗
  - ユーザー数: 5名（変更なし）
  - AI利用回数: 120回/月 → 90回/月
  
  ## 影響するテーブル
  
  ### `subscription_plans`
  - Starter月額プラン (billing_cycle='monthly')
    - max_stores: 2 → 1
    - ai_usage_limit: 120 → 90
    - features配列のAI利用回数の記載を更新
  
  - Starter年額プラン (billing_cycle='annual')
    - max_stores: 2 → 1
    - ai_usage_limit: 120 → 90
    - features配列のAI利用回数の記載を更新
  
  ## 注意事項
  
  1. 価格は変更なし（月額3,980円、年額42,000円）
  2. 既存のサブスクリプションには影響しません（次回更新時に新制限が適用されます）
  3. ユーザー数制限（5名）は変更なし
*/

-- Starter 月額プランの制限を更新
UPDATE subscription_plans
SET 
  max_stores = 1,
  ai_usage_limit = 90,
  features = '[
    "ダッシュボード（日次/週次/月次）",
    "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算",
    "月次経費管理（家賃・消耗品などの固定/変動費）",
    "目標設定＆達成度バッジ（数字の見える化で全員経営）",
    "AIチャット分析（例：改善提案、原価率の異常検知のヒント）",
    "AI自動レポート：月2回（仮）",
    "AI利用：90回/月"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'monthly';

-- Starter 年額プランの制限を更新
UPDATE subscription_plans
SET 
  max_stores = 1,
  ai_usage_limit = 90,
  features = '[
    "ダッシュボード（日次/週次/月次）",
    "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算",
    "月次経費管理（家賃・消耗品などの固定/変動費）",
    "目標設定＆達成度バッジ（数字の見える化で全員経営）",
    "AIチャット分析（例：改善提案、原価率の異常検知のヒント）",
    "AI自動レポート：月2回（仮）",
    "AI利用：90回/月",
    "年払いで10%割引"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'annual';
