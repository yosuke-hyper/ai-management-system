/*
  # Fix Demo AI Usage Check for Fixed Demo Session

  1. Changes
    - Remove is_shareable = true requirement from check_demo_ai_usage function
    - Support both shareable demo sessions (7-day) and fixed demo session (permanent)

  2. Reason
    - Fixed demo session has is_shareable = false but should still work with AI features
*/

-- Update check_demo_ai_usage function to accept both shareable and non-shareable sessions
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

  -- Check if demo session exists and is valid (removed is_shareable check)
  SELECT * INTO v_demo_session
  FROM demo_sessions
  WHERE id = p_demo_session_id
    AND expires_at > now();

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