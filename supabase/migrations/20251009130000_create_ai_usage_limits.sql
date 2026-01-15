/*
  # AI使用制限システム

  ## 概要
  AIチャット機能の1日あたりの使用回数を制限するシステムを実装します。
  ロール別に異なる上限を設定し、コスト管理と適切な利用を促進します。

  ## 新規テーブル

  ### ai_usage_tracking（使用回数追跡テーブル）
  - `id` (uuid, primary key) - レコードID
  - `user_id` (uuid, 外部キー) - ユーザーID
  - `usage_date` (date) - 使用日（日本時間）
  - `request_count` (integer) - リクエスト回数
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時
  - ユニーク制約: (user_id, usage_date)

  ### ai_usage_settings（使用制限設定テーブル）
  - `id` (uuid, primary key) - レコードID
  - `role` (text) - ロール（admin/manager/staff）
  - `daily_limit` (integer) - 1日の上限（-1は無制限）
  - `enabled` (boolean) - 制限の有効/無効
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時
  - ユニーク制約: role

  ## RPC関数

  ### check_and_increment_usage
  ユーザーの使用回数をチェックし、制限内であればカウントを増加させます。

  ### get_user_usage_status
  ユーザーの現在の使用状況（使用回数、上限、残り）を取得します。

  ### reset_user_daily_usage
  特定ユーザーの当日の使用回数をリセットします（管理者専用）。

  ## セキュリティ
  - RLS有効化
  - ユーザーは自分の使用状況のみ参照可能
  - 設定は全員が参照可能、更新は管理者のみ
  - RPC関数はSECURITY DEFINERで実装

  ## パフォーマンス最適化
  - 複合インデックス: (user_id, usage_date)
  - ロールインデックス
  - 自動クリーンアップ（8日以上前のデータ削除）
*/

-- ============================================
-- 1. ai_usage_tracking テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Tokyo')::date,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
);

-- ============================================
-- 2. ai_usage_settings テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  daily_limit integer NOT NULL DEFAULT 20,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_role UNIQUE (role)
);

-- ============================================
-- 3. 初期設定データの投入
-- ============================================

INSERT INTO ai_usage_settings (role, daily_limit, enabled)
VALUES
  ('admin', -1, true),      -- 無制限
  ('manager', 20, true),    -- 20回/日
  ('staff', 5, true)        -- 5回/日
ON CONFLICT (role) DO NOTHING;

-- ============================================
-- 4. インデックス
-- ============================================

-- 使用回数取得用の複合インデックス
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date
ON ai_usage_tracking(user_id, usage_date);

-- ロール別設定取得用のインデックス
CREATE INDEX IF NOT EXISTS idx_usage_settings_role
ON ai_usage_settings(role);

-- ============================================
-- 5. Row Level Security（RLS）
-- ============================================

-- ai_usage_tracking のRLS有効化
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- ai_usage_settings のRLS有効化
ALTER TABLE ai_usage_settings ENABLE ROW LEVEL SECURITY;

-- ai_usage_tracking: SELECT ポリシー（自分のデータのみ参照可能）
DROP POLICY IF EXISTS "Users can view own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can view own usage tracking"
ON ai_usage_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ai_usage_tracking: INSERT ポリシー（自分のデータのみ作成可能）
DROP POLICY IF EXISTS "Users can create own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can create own usage tracking"
ON ai_usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ai_usage_tracking: UPDATE ポリシー（自分のデータのみ更新可能）
DROP POLICY IF EXISTS "Users can update own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can update own usage tracking"
ON ai_usage_tracking
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ai_usage_settings: SELECT ポリシー（全員が参照可能）
DROP POLICY IF EXISTS "Anyone can view usage settings" ON ai_usage_settings;
CREATE POLICY "Anyone can view usage settings"
ON ai_usage_settings
FOR SELECT
TO authenticated
USING (true);

-- ai_usage_settings: UPDATE ポリシー（管理者のみ更新可能）
DROP POLICY IF EXISTS "Admins can update usage settings" ON ai_usage_settings;
CREATE POLICY "Admins can update usage settings"
ON ai_usage_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- ============================================
-- 6. RPC関数: check_and_increment_usage
-- ============================================

CREATE OR REPLACE FUNCTION check_and_increment_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date;
  v_current_count integer;
  v_user_role text;
  v_daily_limit integer;
  v_enabled boolean;
  v_remaining integer;
  v_is_allowed boolean;
BEGIN
  -- 日本時間の現在日付を取得
  v_current_date := (now() AT TIME ZONE 'Asia/Tokyo')::date;

  -- ユーザーのロールを取得
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    v_user_role := 'staff'; -- デフォルト
  END IF;

  -- ロール別の上限設定を取得
  SELECT daily_limit, enabled INTO v_daily_limit, v_enabled
  FROM ai_usage_settings
  WHERE role = v_user_role;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 5; -- デフォルト
  END IF;

  IF v_enabled IS NULL THEN
    v_enabled := true;
  END IF;

  -- 制限が無効の場合は常に許可
  IF NOT v_enabled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_count', 0,
      'daily_limit', -1,
      'remaining', -1,
      'message', '制限は無効化されています'
    );
  END IF;

  -- 管理者（無制限）の場合
  IF v_daily_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_count', 0,
      'daily_limit', -1,
      'remaining', -1,
      'message', '無制限'
    );
  END IF;

  -- 現在の使用回数を取得または初期化
  SELECT request_count INTO v_current_count
  FROM ai_usage_tracking
  WHERE user_id = p_user_id AND usage_date = v_current_date;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  -- 制限チェック
  v_is_allowed := v_current_count < v_daily_limit;

  -- 許可されている場合はカウントを増加
  IF v_is_allowed THEN
    INSERT INTO ai_usage_tracking (user_id, usage_date, request_count)
    VALUES (p_user_id, v_current_date, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
      request_count = ai_usage_tracking.request_count + 1,
      updated_at = now();

    v_current_count := v_current_count + 1;
  END IF;

  v_remaining := GREATEST(0, v_daily_limit - v_current_count);

  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'current_count', v_current_count,
    'daily_limit', v_daily_limit,
    'remaining', v_remaining,
    'message', CASE
      WHEN v_is_allowed THEN '利用可能'
      ELSE '本日の利用上限に達しました'
    END
  );
END;
$$;

-- ============================================
-- 7. RPC関数: get_user_usage_status
-- ============================================

CREATE OR REPLACE FUNCTION get_user_usage_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date;
  v_current_count integer;
  v_user_role text;
  v_daily_limit integer;
  v_enabled boolean;
  v_remaining integer;
  v_reset_at timestamptz;
BEGIN
  -- 日本時間の現在日付を取得
  v_current_date := (now() AT TIME ZONE 'Asia/Tokyo')::date;

  -- 次のリセット時刻（翌日の午前0時 JST）
  v_reset_at := (v_current_date + interval '1 day') AT TIME ZONE 'Asia/Tokyo';

  -- ユーザーのロールを取得
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    v_user_role := 'staff';
  END IF;

  -- ロール別の上限設定を取得
  SELECT daily_limit, enabled INTO v_daily_limit, v_enabled
  FROM ai_usage_settings
  WHERE role = v_user_role;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 5;
  END IF;

  IF v_enabled IS NULL THEN
    v_enabled := true;
  END IF;

  -- 制限が無効の場合
  IF NOT v_enabled THEN
    RETURN jsonb_build_object(
      'current_count', 0,
      'daily_limit', -1,
      'remaining', -1,
      'reset_at', v_reset_at,
      'is_limited', false
    );
  END IF;

  -- 管理者（無制限）の場合
  IF v_daily_limit = -1 THEN
    RETURN jsonb_build_object(
      'current_count', 0,
      'daily_limit', -1,
      'remaining', -1,
      'reset_at', v_reset_at,
      'is_limited', false
    );
  END IF;

  -- 現在の使用回数を取得
  SELECT request_count INTO v_current_count
  FROM ai_usage_tracking
  WHERE user_id = p_user_id AND usage_date = v_current_date;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  v_remaining := GREATEST(0, v_daily_limit - v_current_count);

  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'daily_limit', v_daily_limit,
    'remaining', v_remaining,
    'reset_at', v_reset_at,
    'is_limited', v_current_count >= v_daily_limit
  );
END;
$$;

-- ============================================
-- 8. RPC関数: reset_user_daily_usage（管理者専用）
-- ============================================

CREATE OR REPLACE FUNCTION reset_user_daily_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date;
  v_is_admin boolean;
BEGIN
  -- 実行者が管理者かチェック
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '管理者権限が必要です'
    );
  END IF;

  -- 日本時間の現在日付を取得
  v_current_date := (now() AT TIME ZONE 'Asia/Tokyo')::date;

  -- 当日のカウントをリセット
  UPDATE ai_usage_tracking
  SET request_count = 0, updated_at = now()
  WHERE user_id = p_user_id AND usage_date = v_current_date;

  RETURN jsonb_build_object(
    'success', true,
    'message', '使用回数をリセットしました'
  );
END;
$$;

-- ============================================
-- 9. クリーンアップ関数（古いデータの削除）
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_usage_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 8日以上前のデータを削除
  DELETE FROM ai_usage_tracking
  WHERE usage_date < (now() AT TIME ZONE 'Asia/Tokyo')::date - interval '8 days';
END;
$$;

-- ============================================
-- 10. トリガー関数（updated_at自動更新）
-- ============================================

-- updated_at自動更新トリガー関数（既存の場合は再利用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ai_usage_tracking用トリガー
DROP TRIGGER IF EXISTS trigger_usage_tracking_updated_at ON ai_usage_tracking;
CREATE TRIGGER trigger_usage_tracking_updated_at
  BEFORE UPDATE ON ai_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ai_usage_settings用トリガー
DROP TRIGGER IF EXISTS trigger_usage_settings_updated_at ON ai_usage_settings;
CREATE TRIGGER trigger_usage_settings_updated_at
  BEFORE UPDATE ON ai_usage_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. テーブルコメント
-- ============================================

COMMENT ON TABLE ai_usage_tracking IS
'AIチャット機能の使用回数を追跡するテーブル。ユーザーごと、日付ごとに使用回数を記録します。';

COMMENT ON TABLE ai_usage_settings IS
'ロール別のAI使用制限設定テーブル。admin（無制限）、manager（20回/日）、staff（5回/日）を管理します。';

COMMENT ON FUNCTION check_and_increment_usage IS
'ユーザーの使用回数をチェックし、制限内であればカウントを増加させる関数。
使用例: SELECT check_and_increment_usage(auth.uid());';

COMMENT ON FUNCTION get_user_usage_status IS
'ユーザーの現在の使用状況を取得する関数。
使用例: SELECT get_user_usage_status(auth.uid());';

COMMENT ON FUNCTION reset_user_daily_usage IS
'特定ユーザーの当日の使用回数をリセットする関数（管理者専用）。
使用例: SELECT reset_user_daily_usage(''user-uuid-here'');';

COMMENT ON FUNCTION cleanup_old_usage_data IS
'8日以上前の使用履歴データを削除するクリーンアップ関数。
使用例: SELECT cleanup_old_usage_data();';
