/*
  # AI Personality System - Add AI character settings to organizations

  ## Summary
  Add AI character customization columns to organizations table to enable personalized AI assistant for each organization.

  ## Changes
  1. New Columns:
    - `ai_name` (text) - Name of the AI assistant (default: 'しばちゃん')
    - `ai_personality` (text) - Personality type (default: 'cheerful')
    - `ai_avatar_url` (text) - URL to AI avatar image (optional)

  ## Personality Types:
  - 'cheerful' - Energetic and positive, uses 🐶 and fun language
  - 'professional' - Formal and business-like
  - 'friendly' - Warm and supportive
  - 'analytical' - Data-focused and precise

  ## Security
  - No RLS changes needed (inherits from organizations table)
*/

-- ============================================
-- Add AI Personality Columns
-- ============================================

-- Add ai_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'ai_name'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN ai_name text NOT NULL DEFAULT 'しばちゃん';
  END IF;
END $$;

-- Add ai_personality column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'ai_personality'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN ai_personality text NOT NULL DEFAULT 'cheerful'
    CHECK (ai_personality IN ('cheerful', 'professional', 'friendly', 'analytical'));
  END IF;
END $$;

-- Add ai_avatar_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'ai_avatar_url'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN ai_avatar_url text;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.organizations.ai_name IS 'AIアシスタントの名前（デフォルト: しばちゃん）';
COMMENT ON COLUMN public.organizations.ai_personality IS 'AIの性格タイプ（cheerful: 元気、professional: プロフェッショナル、friendly: 親しみやすい、analytical: 分析的）';
COMMENT ON COLUMN public.organizations.ai_avatar_url IS 'AIアバター画像のURL（オプション）';

-- ============================================
-- Update existing organizations with default values
-- ============================================

UPDATE public.organizations
SET 
  ai_name = 'しばちゃん',
  ai_personality = 'cheerful'
WHERE ai_name IS NULL OR ai_personality IS NULL;

-- ============================================
-- Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ AI Personality System: Columns added successfully';
  RAISE NOTICE '🐶 Default AI: しばちゃん (cheerful personality)';
  RAISE NOTICE '📝 Organizations can now customize their AI assistant';
END $$;