/*
  # Standardプラン制限の更新

  ## 変更内容

  Standardプラン（月額9,980円）の制限を以下のように変更：
  - 店舗数: 5店舗 → 3店舗
  - ユーザー数: 12名（変更なし）
  - AI利用回数: 500回/月 → 300回/月

  ## 影響するテーブル

  ### `subscription_plans`
  - Standard月額プラン (billing_cycle='monthly')
    - max_stores: 5 → 3
    - ai_usage_limit: 500 → 300
    - features配列のAI利用回数の記載を更新

  - Standard年額プラン (billing_cycle='annual')
    - max_stores: 5 → 3
    - ai_usage_limit: 500 → 300
    - features配列のAI利用回数の記載を更新

  ## 注意事項

  1. 価格は変更なし（月額9,980円、年額107,000円）
  2. 既存のサブスクリプションには影響しません（次回更新時に新制限が適用されます）
  3. ユーザー数制限（12名）は変更なし
*/

-- Standard 月額プランの制限を更新
UPDATE subscription_plans
SET
  max_stores = 3,
  ai_usage_limit = 300,
  features = '[
    "Starterの全機能",
    "店舗横断比較（売上・粗利・原価率・人件費率など）",
    "詳細な権限管理（管理者/店長/スタッフ）",
    "Googleスプレッドシート連携（実績の自動集計/共有）",
    "AI自動レポート：週次（最大4回/月）",
    "AIチャット上限拡大：300回/月"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'monthly';

-- Standard 年額プランの制限を更新
UPDATE subscription_plans
SET
  max_stores = 3,
  ai_usage_limit = 300,
  features = '[
    "Starterの全機能",
    "店舗横断比較（売上・粗利・原価率・人件費率など）",
    "詳細な権限管理（管理者/店長/スタッフ）",
    "Googleスプレッドシート連携（実績の自動集計/共有）",
    "AI自動レポート：週次（最大4回/月）",
    "AIチャット上限拡大：300回/月",
    "年払いで10%割引"
  ]'::jsonb,
  updated_at = now()
WHERE name = 'standard' AND billing_cycle = 'annual';
