/*
  # サンプルデータマーキング機能の追加

  1. 変更内容
    - daily_reportsテーブルにis_sampleカラムを追加
    - サンプルデータを識別・一括削除可能に

  2. 目的
    - サンプルデータと本番データの混在を防止
    - ユーザーがサンプルデータを簡単に削除可能に
*/

-- daily_reportsにis_sampleカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'is_sample'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN is_sample boolean DEFAULT false;
  END IF;
END $$;

-- is_sampleにインデックスを作成（サンプルデータ検索用）
CREATE INDEX IF NOT EXISTS idx_daily_reports_is_sample ON daily_reports(is_sample) WHERE is_sample = true;

-- サンプルデータ一括削除用の関数
CREATE OR REPLACE FUNCTION delete_sample_data_for_store(
  p_organization_id uuid,
  p_store_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM daily_reports
  WHERE organization_id = p_organization_id
    AND store_id = p_store_id
    AND is_sample = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
