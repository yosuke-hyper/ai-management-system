/*
  # デモデータに原価を追加

  1. 変更内容
    - 固定デモ日報データに原価（purchase）を追加
    - 売上の約30-35%を原価として設定（飲食店の平均的な原価率）
    - 店舗・日付によって若干のバリエーションを持たせる

  2. データ整合性
    - 既存の売上データに基づいて原価を計算
    - 粗利益率が65-70%になるように調整
*/

-- 新宿店の原価を追加（原価率 32-35%）
UPDATE fixed_demo_reports
SET purchase = ROUND(sales * (0.32 + (EXTRACT(DAY FROM date) % 4) * 0.01))
WHERE store_id = (SELECT id FROM fixed_demo_stores WHERE name = '新宿店' LIMIT 1);

-- 渋谷店の原価を追加（原価率 30-33%）
UPDATE fixed_demo_reports
SET purchase = ROUND(sales * (0.30 + (EXTRACT(DAY FROM date) % 4) * 0.01))
WHERE store_id = (SELECT id FROM fixed_demo_stores WHERE name = '渋谷店' LIMIT 1);