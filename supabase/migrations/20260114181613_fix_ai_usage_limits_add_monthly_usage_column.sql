/*
  # ai_usage_limits テーブルに monthly_usage 列を追加（互換性のため）

  1. 変更内容
    - `monthly_usage` 列を追加（`current_usage` と同期）
    - 既存データの互換性を保持

  2. 理由
    - フロントエンドが `monthly_usage` を参照している
    - `current_usage` と `monthly_usage` を両方サポート
*/

-- monthly_usage 列を追加（まだ存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_limits' AND column_name = 'monthly_usage'
  ) THEN
    ALTER TABLE ai_usage_limits
    ADD COLUMN monthly_usage integer NOT NULL DEFAULT 0;
    
    -- 既存のcurrent_usageをmonthly_usageにコピー
    UPDATE ai_usage_limits
    SET monthly_usage = current_usage;
    
    RAISE NOTICE '✅ monthly_usage 列を追加しました';
  END IF;
END $$;

-- monthly_usage を自動同期するトリガー（オプション）
CREATE OR REPLACE FUNCTION sync_monthly_usage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monthly_usage := NEW.current_usage;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_monthly_usage_trigger ON ai_usage_limits;
CREATE TRIGGER sync_monthly_usage_trigger
  BEFORE INSERT OR UPDATE ON ai_usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION sync_monthly_usage();
