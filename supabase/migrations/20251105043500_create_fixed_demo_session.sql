/*
  # Create Fixed Demo Session for Old Demo Mode

  1. Changes
    - Create a fixed demo organization for old demo mode
    - Create a fixed demo session that never expires (for backwards compatibility)

  2. Purpose
    - Support old demo mode (localStorage 'demo_mode' = 'true') with AI features
    - Provide seamless upgrade path from old to new demo system
*/

-- Insert fixed demo organization (idempotent)
INSERT INTO demo_organizations (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Fixed Demo Organization',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert fixed demo session that expires in 100 years (effectively permanent for old demo mode)
INSERT INTO demo_sessions (
  id,
  email,
  demo_org_id,
  session_token,
  share_token,
  expires_at,
  is_shareable,
  access_count
)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'demo@example.com',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'fixed-demo-session-token',
  'fixed-demo-share-token',
  (now() + interval '100 years'),
  false,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Create AI usage tracking for fixed demo session
INSERT INTO demo_ai_usage_tracking (
  demo_session_id,
  chat_count,
  report_count
)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  0,
  0
)
ON CONFLICT (demo_session_id) DO NOTHING;

COMMENT ON TABLE demo_sessions IS
'Demo sessions for trial users. Includes both shareable sessions (7-day expiry) and the fixed session for old demo mode (100-year expiry).';
