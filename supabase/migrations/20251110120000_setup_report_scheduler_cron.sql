/*
  # レポート自動生成スケジューラーのCron Job設定

  ## 変更内容

  1. pg_cron拡張機能の有効化
    - Supabase内でCron Jobを実行するために必要

  2. Cron Jobの作成
    - 毎時0分に実行（例: 1:00, 2:00, 3:00...）
    - scheduled-report-generator Edge Functionを呼び出し
    - 実行すべきスケジュールがある場合のみレポートを生成

  3. 仕組み
    - report_schedulesテーブルから有効なスケジュールを取得
    - next_run_atが現在時刻以前のものを処理
    - レポート生成後、next_run_atを更新

  4. スケジュール例
    - 週次: 毎週月曜 6:00 (cron: '0 6 * * 1')
    - 月次: 毎月1日 6:00 (cron: '0 6 1 * *')

  ## セキュリティ
  - Edge Functionの認証はSERVICE_ROLE_KEYで実行
  - RLSポリシーにより組織ごとに適切にデータが分離される
*/

-- ============================================
-- 1. pg_cron拡張機能の有効化
-- ============================================

-- Note: Supabaseでは既にpg_cronが有効化されている場合がありますが、
-- 念のため明示的に確認・有効化します
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- ============================================
-- 2. Cron Jobの作成
-- ============================================

-- 既存のスケジュールがある場合は削除
SELECT cron.unschedule('generate-scheduled-reports')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-scheduled-reports'
);

-- 毎時0分にスケジュールされたレポートを生成
-- 実際のレポート生成時刻はreport_schedulesテーブルのcron_expressionに従う
SELECT cron.schedule(
  'generate-scheduled-reports',          -- ジョブ名
  '0 * * * *',                          -- 毎時0分に実行
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/scheduled-report-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 3. 設定値の保存（Supabase URLとKEY）
-- ============================================

-- Note: これらの設定値は実際にはSupabase Dashboard
-- または環境変数から取得する必要があります
-- このマイグレーションでは設定の構造のみを作成

-- カスタム設定テーブルの作成（まだ存在しない場合）
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- システム設定へのRLS有効化
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- システム設定は誰でも読める（ただし機密情報は保存しない）
CREATE POLICY "System settings are readable by authenticated users"
ON system_settings
FOR SELECT
TO authenticated
USING (true);

-- システム設定はサービスロールのみ書き込める
-- （通常はSupabase Dashboardから設定）

-- ============================================
-- 4. ヘルパー関数: スケジュール実行確認
-- ============================================

-- 次回実行予定のスケジュールを取得する関数
CREATE OR REPLACE FUNCTION get_pending_report_schedules()
RETURNS TABLE (
  schedule_id uuid,
  report_type text,
  store_id uuid,
  cron_expression text,
  next_run_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id,
    rs.report_type,
    rs.store_id,
    rs.cron_expression,
    rs.next_run_at
  FROM report_schedules rs
  WHERE rs.is_enabled = true
    AND (rs.next_run_at IS NULL OR rs.next_run_at <= now())
  ORDER BY rs.next_run_at NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 次回実行時刻を計算する関数
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_cron_expression text,
  p_current_time timestamptz DEFAULT now()
)
RETURNS timestamptz AS $$
DECLARE
  v_next_time timestamptz;
  v_parts text[];
  v_minute int;
  v_hour int;
  v_day_of_month int;
  v_month int;
  v_day_of_week int;
BEGIN
  -- Cron式を解析（簡易版: '分 時 日 月 曜日'）
  v_parts := string_to_array(p_cron_expression, ' ');

  v_minute := CASE WHEN v_parts[1] = '*' THEN 0 ELSE v_parts[1]::int END;
  v_hour := CASE WHEN v_parts[2] = '*' THEN 0 ELSE v_parts[2]::int END;

  -- 週次スケジュール（例: '0 6 * * 1' - 毎週月曜 6:00）
  IF v_parts[5] != '*' THEN
    v_day_of_week := v_parts[5]::int;
    v_next_time := date_trunc('day', p_current_time) + interval '1 day';

    -- 次の指定曜日を見つける
    WHILE EXTRACT(DOW FROM v_next_time)::int != v_day_of_week LOOP
      v_next_time := v_next_time + interval '1 day';
    END LOOP;

    v_next_time := v_next_time + (v_hour || ' hours')::interval + (v_minute || ' minutes')::interval;

    -- 既に過ぎている場合は次週
    IF v_next_time <= p_current_time THEN
      v_next_time := v_next_time + interval '7 days';
    END IF;

  -- 月次スケジュール（例: '0 6 1 * *' - 毎月1日 6:00）
  ELSIF v_parts[3] != '*' THEN
    v_day_of_month := v_parts[3]::int;

    -- 今月の指定日
    v_next_time := date_trunc('month', p_current_time) + ((v_day_of_month - 1) || ' days')::interval;
    v_next_time := v_next_time + (v_hour || ' hours')::interval + (v_minute || ' minutes')::interval;

    -- 既に過ぎている場合は来月
    IF v_next_time <= p_current_time THEN
      v_next_time := date_trunc('month', p_current_time) + interval '1 month';
      v_next_time := v_next_time + ((v_day_of_month - 1) || ' days')::interval;
      v_next_time := v_next_time + (v_hour || ' hours')::interval + (v_minute || ' minutes')::interval;
    END IF;

  -- 日次スケジュール（例: '0 6 * * *' - 毎日 6:00）
  ELSE
    v_next_time := date_trunc('day', p_current_time) + (v_hour || ' hours')::interval + (v_minute || ' minutes')::interval;

    -- 既に過ぎている場合は明日
    IF v_next_time <= p_current_time THEN
      v_next_time := v_next_time + interval '1 day';
    END IF;
  END IF;

  RETURN v_next_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. 初期スケジュールのnext_run_atを設定
-- ============================================

-- 既存のスケジュールで next_run_at が NULL の場合、初期値を設定
UPDATE report_schedules
SET next_run_at = calculate_next_run_time(cron_expression)
WHERE next_run_at IS NULL;

-- ============================================
-- 6. トリガー: 新規スケジュール作成時にnext_run_atを自動設定
-- ============================================

CREATE OR REPLACE FUNCTION set_initial_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_run_at IS NULL THEN
    NEW.next_run_at := calculate_next_run_time(NEW.cron_expression);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS trigger_set_initial_next_run_at ON report_schedules;

-- トリガーを作成
CREATE TRIGGER trigger_set_initial_next_run_at
  BEFORE INSERT ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_next_run_at();

-- ============================================
-- 7. 実行ログ用インデックス
-- ============================================

-- report_generation_logs テーブルが既に存在する前提
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_started_at
  ON report_generation_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_schedule_id
  ON report_generation_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_status
  ON report_generation_logs(status);

-- ============================================
-- 8. コメント
-- ============================================

COMMENT ON FUNCTION get_pending_report_schedules() IS
  '実行待ちのレポートスケジュールを取得する';

COMMENT ON FUNCTION calculate_next_run_time(text, timestamptz) IS
  'Cron式から次回実行時刻を計算する（簡易版）';

COMMENT ON FUNCTION set_initial_next_run_at() IS
  '新規スケジュール作成時に次回実行時刻を自動設定する';
