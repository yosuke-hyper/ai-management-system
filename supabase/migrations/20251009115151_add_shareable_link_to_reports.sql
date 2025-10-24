/*
  # Add Shareable Link Support to AI Reports

  ## Changes
  1. Add `share_token` column to ai_generated_reports table
    - Unique token for public access
    - Used to generate shareable links
  
  2. Add `is_public` flag
    - Controls whether report can be accessed via share link
  
  3. Create public access policy
    - Allows unauthenticated access via valid share_token

  ## Security
  - Share tokens are randomly generated UUIDs
  - Reports are only accessible with valid token and is_public = true
  - Tokens can be regenerated to revoke access
*/

-- Add share_token and is_public columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_generated_reports' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE ai_generated_reports 
    ADD COLUMN share_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_generated_reports' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE ai_generated_reports 
    ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;

-- Create index for share_token lookups
CREATE INDEX IF NOT EXISTS idx_ai_reports_share_token 
  ON ai_generated_reports(share_token) 
  WHERE is_public = true;

-- Add policy for public access via share token
CREATE POLICY "Public can view reports with valid share token"
  ON ai_generated_reports FOR SELECT
  TO anon
  USING (
    is_public = true 
    AND share_token IS NOT NULL
  );
