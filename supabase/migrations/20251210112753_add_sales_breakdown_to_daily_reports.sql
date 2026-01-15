/*
  # 日報テーブルに売上内訳カラムを追加

  ## 変更内容
  1. 新しいカラムの追加
    - `sales_cash_10` - 現金売上（10%税率）
    - `sales_cash_8` - 現金売上（8%税率）
    - `sales_credit_10` - クレジット売上（10%税率）
    - `sales_credit_8` - クレジット売上（8%税率）

  ## 説明
  現在、日報テーブル (daily_reports) には合計売上 (sales) のみが保存されていますが、
  月次売上エクスポートで現金とクレジットの内訳を正しく表示するために、
  これらの詳細な内訳を保存する必要があります。
*/

-- 売上内訳カラムを追加
ALTER TABLE daily_reports
ADD COLUMN IF NOT EXISTS sales_cash_10 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_cash_8 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_credit_10 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_credit_8 integer DEFAULT 0;

-- コメントを追加
COMMENT ON COLUMN daily_reports.sales_cash_10 IS '現金売上（10%税率）';
COMMENT ON COLUMN daily_reports.sales_cash_8 IS '現金売上（8%税率）';
COMMENT ON COLUMN daily_reports.sales_credit_10 IS 'クレジット売上（10%税率）';
COMMENT ON COLUMN daily_reports.sales_credit_8 IS 'クレジット売上（8%税率）';
