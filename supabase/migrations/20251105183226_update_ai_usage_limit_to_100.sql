/*
  # AI利用回数を100回に統一

  ## 変更内容
  
  全プランのAI利用回数を1店舗あたり月100回に統一：
  - Starter月額プラン: 90回 → 100回
  - Starter年額プラン: 90回 → 100回
  - Standard月額プラン: 300回 → 100回（※1店舗あたりの想定）
  - Standard年額プラン: 300回 → 100回（※1店舗あたりの想定）
  
  ## 影響するテーブル
  
  ### `subscription_plans`
  - 全プランのai_usage_limitを100に更新
  - features配列のAI利用回数の記載を「1店舗あたり月100回」に統一
  
  ## 注意事項
  
  1. 価格は変更なし
  2. 店舗数・ユーザー数制限は変更なし
  3. 既存のサブスクリプションには影響しません（次回更新時に新制限が適用されます）
*/

-- Starter 月額プランのAI利用回数を100回に更新
UPDATE subscription_plans
SET 
  ai_usage_limit = 100,
  features = '[
    "ダッシュボード（日次/週次/月次）",
    "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算",
    "月次経費管理（家賃・消耗品などの固定/変動費）",
    "目標設定＆達成度バッジ（数字の見える化で全員経営）",
    "AIチャット分析（例：改善提案、原価率の異常検知のヒント）",
    "AI自動レポート：月2回（仮）",
    "AI利用：1店舗あたり月100回（チャット＋分析合計）"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'monthly';

-- Starter 年額プランのAI利用回数を100回に更新
UPDATE subscription_plans
SET 
  ai_usage_limit = 100,
  features = '[
    "ダッシュボード（日次/週次/月次）",
    "日報入力（売上・原価・人件費など）→ 粗利・原価率を自動計算",
    "月次経費管理（家賃・消耗品などの固定/変動費）",
    "目標設定＆達成度バッジ（数字の見える化で全員経営）",
    "AIチャット分析（例：改善提案、原価率の異常検知のヒント）",
    "AI自動レポート：月2回（仮）",
    "AI利用：1店舗あたり月100回（チャット＋分析合計）",
    "年払いで10%割引"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'starter' AND billing_cycle = 'annual';

-- Standard 月額プランのAI利用回数を100回に更新
UPDATE subscription_plans
SET
  ai_usage_limit = 100,
  features = '[
    "Starterの全機能",
    "店舗横断比較（売上・粗利・原価率・人件費率など）",
    "詳細な権限管理（管理者/店長/スタッフ）",
    "Googleスプレッドシート連携（実績の自動集計/共有）",
    "AI自動レポート：週次（最大4回/月）",
    "AI利用：1店舗あたり月100回（チャット＋分析合計）"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'monthly';

-- Standard 年額プランのAI利用回数を100回に更新
UPDATE subscription_plans
SET
  ai_usage_limit = 100,
  features = '[
    "Starterの全機能",
    "店舗横断比較（売上・粗利・原価率・人件費率など）",
    "詳細な権限管理（管理者/店長/スタッフ）",
    "Googleスプレッドシート連携（実績の自動集計/共有）",
    "AI自動レポート：週次（最大4回/月）",
    "AI利用：1店舗あたり月100回（チャット＋分析合計）",
    "年払いで10%割引"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';
