/*
  # Demo AI Usage Tracking System

  1. New Tables
    - `demo_ai_usage_tracking`
      - `id` (uuid, primary key)
      - `demo_session_id` (uuid, foreign key to demo_sessions)
      - `chat_count` (integer) - Number of AI chat messages used
      - `report_count` (integer) - Number of AI reports generated
      - `last_chat_at` (timestamptz) - Last chat usage timestamp
      - `last_report_at` (timestamptz) - Last report generation timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Limits
    - Chat: 5 messages per demo session
    - Reports: 3 reports per demo session
    - Reset: When demo session expires (7 days)

  3. Security
    - Enable RLS on `demo_ai_usage_tracking` table
    - Allow anonymous users to read their own usage
    - Allow anonymous users to increment their own usage
    - Automatically create usage record when demo session is created

  4. Functions
    - `check_demo_ai_usage` - Check if user can use AI features
    - `increment_demo_ai_usage` - Increment usage count
    - `get_demo_ai_usage_status` - Get current usage status
*/

-- Create demo_ai_usage_tracking table
CREATE TABLE IF NOT EXISTS demo_ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_session_id uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  chat_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  last_chat_at timestamptz,
  last_report_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_demo_session_usage UNIQUE (demo_session_id),
  CONSTRAINT chat_count_positive CHECK (chat_count >= 0),
  CONSTRAINT report_count_positive CHECK (report_count >= 0)
);

-- Enable RLS
ALTER TABLE demo_ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read usage for any demo session (needed for public demo access)
CREATE POLICY "Anyone can read demo AI usage"
  ON demo_ai_usage_tracking
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous users to insert usage records
CREATE POLICY "Anyone can insert demo AI usage"
  ON demo_ai_usage_tracking
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to update usage records
CREATE POLICY "Anyone can update demo AI usage"
  ON demo_ai_usage_tracking
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_demo_ai_usage_session_id ON demo_ai_usage_tracking(demo_session_id);

-- Function to check if demo user can use AI features
CREATE OR REPLACE FUNCTION check_demo_ai_usage(
  p_demo_session_id uuid,
  p_feature_type text -- 'chat' or 'report'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_record demo_ai_usage_tracking;
  v_demo_session demo_sessions;
  v_can_use boolean;
  v_remaining integer;
  v_limit integer;
  v_current_count integer;
BEGIN
  -- Define limits
  IF p_feature_type = 'chat' THEN
    v_limit := 5;
  ELSIF p_feature_type = 'report' THEN
    v_limit := 3;
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Invalid feature type'
    );
  END IF;

  -- Check if demo session exists and is valid
  SELECT * INTO v_demo_session
  FROM demo_sessions
  WHERE id = p_demo_session_id
    AND expires_at > now()
    AND is_shareable = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Demo session expired or invalid',
      'message', 'このデモセッションは期限切れまたは無効です。'
    );
  END IF;

  -- Get or create usage record
  SELECT * INTO v_usage_record
  FROM demo_ai_usage_tracking
  WHERE demo_session_id = p_demo_session_id;

  IF NOT FOUND THEN
    -- Create new usage record
    INSERT INTO demo_ai_usage_tracking (demo_session_id)
    VALUES (p_demo_session_id)
    RETURNING * INTO v_usage_record;
  END IF;

  -- Check usage based on feature type
  IF p_feature_type = 'chat' THEN
    v_current_count := v_usage_record.chat_count;
  ELSE
    v_current_count := v_usage_record.report_count;
  END IF;

  v_can_use := v_current_count < v_limit;
  v_remaining := GREATEST(0, v_limit - v_current_count);

  RETURN jsonb_build_object(
    'allowed', v_can_use,
    'current_count', v_current_count,
    'limit', v_limit,
    'remaining', v_remaining,
    'feature_type', p_feature_type,
    'demo_session_id', p_demo_session_id,
    'expires_at', v_demo_session.expires_at,
    'message', CASE
      WHEN v_can_use THEN format('残り%s回利用可能', v_remaining)
      ELSE format('デモ期間中の利用上限（%s回）に達しました。本登録で無制限に利用できます。', v_limit)
    END
  );
END;
$$;

-- Function to increment demo AI usage
CREATE OR REPLACE FUNCTION increment_demo_ai_usage(
  p_demo_session_id uuid,
  p_feature_type text -- 'chat' or 'report'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_result jsonb;
  v_updated_record demo_ai_usage_tracking;
BEGIN
  -- First check if usage is allowed
  v_check_result := check_demo_ai_usage(p_demo_session_id, p_feature_type);

  IF NOT (v_check_result->>'allowed')::boolean THEN
    RETURN v_check_result;
  END IF;

  -- Increment the appropriate counter
  IF p_feature_type = 'chat' THEN
    UPDATE demo_ai_usage_tracking
    SET
      chat_count = chat_count + 1,
      last_chat_at = now(),
      updated_at = now()
    WHERE demo_session_id = p_demo_session_id
    RETURNING * INTO v_updated_record;
  ELSIF p_feature_type = 'report' THEN
    UPDATE demo_ai_usage_tracking
    SET
      report_count = report_count + 1,
      last_report_at = now(),
      updated_at = now()
    WHERE demo_session_id = p_demo_session_id
    RETURNING * INTO v_updated_record;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid feature type'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'chat_count', v_updated_record.chat_count,
    'report_count', v_updated_record.report_count,
    'remaining_chats', GREATEST(0, 5 - v_updated_record.chat_count),
    'remaining_reports', GREATEST(0, 3 - v_updated_record.report_count),
    'message', '使用回数を記録しました'
  );
END;
$$;

-- Function to get demo AI usage status
CREATE OR REPLACE FUNCTION get_demo_ai_usage_status(
  p_demo_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_record demo_ai_usage_tracking;
  v_demo_session demo_sessions;
BEGIN
  -- Check if demo session exists and is valid
  SELECT * INTO v_demo_session
  FROM demo_sessions
  WHERE id = p_demo_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'error', 'Demo session not found'
    );
  END IF;

  -- Get or create usage record
  SELECT * INTO v_usage_record
  FROM demo_ai_usage_tracking
  WHERE demo_session_id = p_demo_session_id;

  IF NOT FOUND THEN
    -- Create new usage record
    INSERT INTO demo_ai_usage_tracking (demo_session_id)
    VALUES (p_demo_session_id)
    RETURNING * INTO v_usage_record;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'is_expired', v_demo_session.expires_at < now(),
    'expires_at', v_demo_session.expires_at,
    'chat', jsonb_build_object(
      'used', v_usage_record.chat_count,
      'limit', 5,
      'remaining', GREATEST(0, 5 - v_usage_record.chat_count),
      'last_used_at', v_usage_record.last_chat_at
    ),
    'report', jsonb_build_object(
      'used', v_usage_record.report_count,
      'limit', 3,
      'remaining', GREATEST(0, 3 - v_usage_record.report_count),
      'last_used_at', v_usage_record.last_report_at
    ),
    'created_at', v_usage_record.created_at,
    'updated_at', v_usage_record.updated_at
  );
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_ai_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_ai_usage_timestamp
  BEFORE UPDATE ON demo_ai_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_ai_usage_timestamp();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON demo_ai_usage_tracking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_demo_ai_usage(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_demo_ai_usage(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_demo_ai_usage_status(uuid) TO anon, authenticated;
