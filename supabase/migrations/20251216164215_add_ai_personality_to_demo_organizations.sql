/*
  # Add AI Personality to Demo Organizations

  ## Summary
  Add AI character customization columns to demo_organizations table to enable personalized AI assistant in demo mode.

  ## Changes
  1. New Columns:
    - `ai_name` (text) - Name of the AI assistant (default: 'しばちゃん')
    - `ai_personality` (text) - Personality type (default: 'cheerful')

  ## Security
  - No RLS changes needed (inherits from demo_organizations table)
*/

-- ============================================
-- Add AI Personality Columns to Demo Organizations
-- ============================================

-- Add ai_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_organizations' AND column_name = 'ai_name'
  ) THEN
    ALTER TABLE public.demo_organizations
    ADD COLUMN ai_name text NOT NULL DEFAULT 'しばちゃん';
  END IF;
END $$;

-- Add ai_personality column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_organizations' AND column_name = 'ai_personality'
  ) THEN
    ALTER TABLE public.demo_organizations
    ADD COLUMN ai_personality text NOT NULL DEFAULT 'cheerful'
    CHECK (ai_personality IN ('cheerful', 'professional', 'friendly', 'analytical'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.demo_organizations.ai_name IS 'デモ用AIアシスタントの名前（デフォルト: しばちゃん）';
COMMENT ON COLUMN public.demo_organizations.ai_personality IS 'デモ用AIの性格タイプ（cheerful, professional, friendly, analytical）';

-- ============================================
-- Update existing demo organizations with default values
-- ============================================

UPDATE public.demo_organizations
SET 
  ai_name = 'しばちゃん',
  ai_personality = 'cheerful'
WHERE ai_name IS NULL OR ai_personality IS NULL;

-- ============================================
-- Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Demo Organizations: AI Personality columns added successfully';
  RAISE NOTICE '🐶 Default AI for demos: しばちゃん (cheerful personality)';
END $$;