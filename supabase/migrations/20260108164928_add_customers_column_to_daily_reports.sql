/*
  # daily_reportsテーブルにcustomersカラムを追加

  1. 変更内容
    - `daily_reports`テーブルに`customers`カラム（integer型）を追加
    - デフォルト値は0
    - 通常営業（full_day）で使用される客数フィールド
  
  2. 理由
    - コードが`customers`カラムに保存しようとしているが、テーブルに存在しない
    - `lunch_customers`と`dinner_customers`は存在するが、通常営業用の`customers`が不足していた
*/

-- customersカラムを追加
ALTER TABLE daily_reports
ADD COLUMN IF NOT EXISTS customers integer DEFAULT 0;
