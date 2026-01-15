/*
  # サブスクリプションに支払いサイクルを追加

  ## 変更内容

  ### テーブル変更
  - `organization_subscriptions` テーブルに `billing_cycle` カラムを追加
    - 'monthly': 月額払い
    - 'six_month': 6ヶ月まとめ払い
    - デフォルト値: 'monthly'

  ## 理由
  - ユーザーが月額払いと6ヶ月まとめ払いを選択できるようにする
  - 6ヶ月まとめ払いは割引価格を提供
  - 選択した支払いサイクルをページ移動後も保持

  ## セキュリティ
  - 既存のRLSポリシーがそのまま適用される
*/

-- billing_cycle カラムを追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscriptions'
    AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE organization_subscriptions
    ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'six_month'));
  END IF;
END $$;

-- 既存のレコードはすべて 'monthly' に設定（デフォルト値で対応済み）

-- カラムにコメントを追加
COMMENT ON COLUMN organization_subscriptions.billing_cycle IS '支払いサイクル: monthly（月額）, six_month（6ヶ月まとめ払い）';
