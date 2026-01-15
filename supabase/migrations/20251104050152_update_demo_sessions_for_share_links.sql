/*
  # Update Demo Sessions for Share Links (7 Days)

  ## Changes Made
  
  1. Modify `demo_sessions` Table
    - Change default expiration from 14 days to 7 days
    - Add `share_token` column for shareable demo URLs (unique, indexed)
    - Add `is_shareable` column to enable/disable link sharing
    - Add `access_count` column to track how many times the link was accessed
  
  2. Update Indexes
    - Add index on `share_token` for fast lookups
    - Keep existing index on `session_token`
  
  3. Update RLS Policies
    - Add policy for public access via share_token (when not expired)
    - Maintain existing session_token based access
  
  4. Security Considerations
    - Share tokens are separate from session tokens
    - Share tokens can be disabled without affecting existing sessions
    - Expired sessions cannot be accessed via share tokens
    - Access count helps detect abuse
*/

-- Add new columns to demo_sessions
ALTER TABLE demo_sessions 
ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS is_shareable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0;

-- Update the default expiration to 7 days for NEW sessions
ALTER TABLE demo_sessions 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_demo_sessions_share_token ON demo_sessions(share_token);

-- Drop existing public access policy if exists
DROP POLICY IF EXISTS "Public can access demo via share token" ON demo_sessions;

-- Add RLS policy for public access via share_token
CREATE POLICY "Public can access demo via share token"
  ON demo_sessions
  FOR SELECT
  USING (
    share_token IS NOT NULL
    AND is_shareable = true
    AND expires_at > now()
  );

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Public can update demo access count" ON demo_sessions;

-- Allow updating access_count and last_accessed_at via share_token
CREATE POLICY "Public can update demo access count"
  ON demo_sessions
  FOR UPDATE
  USING (
    share_token IS NOT NULL
    AND is_shareable = true
    AND expires_at > now()
  )
  WITH CHECK (
    share_token IS NOT NULL
    AND is_shareable = true
    AND expires_at > now()
  );

-- Update the cleanup function to handle share tokens
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions expired more than 7 days ago
  DELETE FROM demo_sessions
  WHERE expires_at < now() - interval '7 days';
  
  -- Delete orphaned demo organizations (no active sessions)
  DELETE FROM demo_organizations
  WHERE id NOT IN (SELECT DISTINCT demo_org_id FROM demo_sessions);
END;
$$;

-- Add comment
COMMENT ON COLUMN demo_sessions.share_token IS 'Unique token for shareable demo links (7 days validity)';
COMMENT ON COLUMN demo_sessions.is_shareable IS 'Whether this demo session can be accessed via share link';
COMMENT ON COLUMN demo_sessions.access_count IS 'Number of times this demo has been accessed via share link';
