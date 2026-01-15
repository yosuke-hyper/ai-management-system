/*
  # 通知チェッカーのCron Job設定

  ## 変更内容

  1. Cron Jobの作成
    - 毎時0分に実行
    - check-notifications Edge Functionを呼び出し
    - AI使用量、トライアル期限、低パフォーマンス店舗をチェック

  2. 仕組み
    - AI使用量: 80%, 90%, 100%の閾値で通知
    - トライアル期限: 7日前、3日前、1日前に通知
    - 低パフォーマンス: 前日の目標達成率70%未満で通知

  3. セキュリティ
    - Edge FunctionはSERVICE_ROLE_KEYで実行
    - 全組織のデータにアクセス可能
    - 通知は適切なユーザーにのみ送信

  ## 依存関係
  - notifications テーブル
  - ai_usage_tracking テーブル
  - ai_usage_settings テーブル
  - subscriptions テーブル
  - daily_reports テーブル
*/

-- ============================================
-- 1. Cron Jobの作成（通知チェック）
-- ============================================

-- 既存のスケジュールがある場合は削除
SELECT cron.unschedule('check-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-notifications'
);

-- 毎時0分に通知チェックを実行
-- AI使用量、トライアル期限、低パフォーマンス店舗を監視
SELECT cron.schedule(
  'check-notifications',                     -- ジョブ名
  '0 * * * *',                               -- 毎時0分に実行
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/check-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 2. 通知関連のインデックス最適化
-- ============================================

-- 通知の検索パフォーマンス向上
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_type
  ON notifications(organization_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_title_search
  ON notifications(user_id, title);

-- AI使用量トラッキングのインデックス
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_org_month
  ON ai_usage_tracking(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_month
  ON ai_usage_tracking(user_id, created_at DESC);

-- サブスクリプションのインデックス
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status, trial_end);

-- 日報のインデックス（パフォーマンスチェック用）
CREATE INDEX IF NOT EXISTS idx_daily_reports_date_performance
  ON daily_reports(date, store_id, target_sales)
  WHERE target_sales IS NOT NULL;

-- ============================================
-- 3. 通知の自動削除（古い通知のクリーンアップ）
-- ============================================

-- 60日以上前の既読通知を削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE read = true
    AND created_at < now() - interval '60 days';

  -- 期限切れの通知も削除
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 古い通知を削除するCron Job（毎日午前3時）
SELECT cron.unschedule('cleanup-old-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications'
);

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',                               -- 毎日午前3時
  $$ SELECT cleanup_old_notifications(); $$
);

-- ============================================
-- 4. 通知統計ビュー
-- ============================================

-- 組織ごとの通知統計ビュー
CREATE OR REPLACE VIEW notification_stats AS
SELECT
  organization_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE read = false) as unread_count,
  COUNT(*) FILTER (WHERE type = 'error') as error_count,
  COUNT(*) FILTER (WHERE type = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE type = 'success') as success_count,
  COUNT(*) FILTER (WHERE type = 'info') as info_count,
  MAX(created_at) as last_notification_at
FROM notifications
WHERE created_at >= current_date - interval '30 days'
GROUP BY organization_id;

-- ユーザーごとの未読通知数ビュー
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT
  user_id,
  organization_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE type = 'error') as error_count,
  COUNT(*) FILTER (WHERE type = 'warning') as warning_count,
  MAX(created_at) as latest_notification_at
FROM notifications
WHERE read = false
  AND (expires_at IS NULL OR expires_at > now())
GROUP BY user_id, organization_id;

-- ============================================
-- 5. コメント
-- ============================================

COMMENT ON FUNCTION cleanup_old_notifications() IS
  '60日以上前の既読通知と期限切れの通知を削除する';

COMMENT ON VIEW notification_stats IS
  '過去30日間の組織ごとの通知統計';

COMMENT ON VIEW user_unread_notifications IS
  'ユーザーごとの未読通知の集計';

-- ============================================
-- 6. 実行確認用クエリ（コメント）
-- ============================================

/*
-- Cron Jobが正しく登録されているか確認
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('check-notifications', 'cleanup-old-notifications');

-- Cron Jobの実行履歴を確認
SELECT
  jobname,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobname = 'check-notifications'
ORDER BY start_time DESC
LIMIT 10;

-- 最近作成された通知を確認
SELECT
  type,
  title,
  message,
  created_at,
  read
FROM notifications
WHERE created_at >= current_date
ORDER BY created_at DESC
LIMIT 20;

-- 組織ごとの通知統計を確認
SELECT * FROM notification_stats
ORDER BY total_notifications DESC;

-- ユーザーの未読通知数を確認
SELECT * FROM user_unread_notifications
ORDER BY unread_count DESC;
*/
