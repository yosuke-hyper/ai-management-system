/*
  # Change Default AI Personality to Friendly

  ## Summary
  Change the default AI personality from 'cheerful' to 'friendly' for a more balanced, warm, and professional tone.

  ## Changes
  1. Update default value for organizations.ai_personality to 'friendly'
  2. Update default value for demo_organizations.ai_personality to 'friendly'
  3. Update existing records to use 'friendly' personality

  ## Personality Comparison:
  - Cheerful: Very energetic, uses "ワン！" extensively (may be too casual)
  - Friendly: Warm and supportive, balanced professionalism (recommended default)
*/

-- ============================================
-- Update Organizations Table Default
-- ============================================

-- Change default for new organizations
ALTER TABLE public.organizations
  ALTER COLUMN ai_personality SET DEFAULT 'friendly';

-- Update existing organizations to friendly
UPDATE public.organizations
SET ai_personality = 'friendly'
WHERE ai_personality = 'cheerful';

-- ============================================
-- Update Demo Organizations Table Default
-- ============================================

-- Change default for new demo organizations
ALTER TABLE public.demo_organizations
  ALTER COLUMN ai_personality SET DEFAULT 'friendly';

-- Update existing demo organizations to friendly
UPDATE public.demo_organizations
SET ai_personality = 'friendly'
WHERE ai_personality = 'cheerful';

-- ============================================
-- Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Default AI personality changed to "friendly"';
  RAISE NOTICE '😊 New tone: Warm, supportive, and balanced';
  RAISE NOTICE '📝 All existing organizations updated to friendly personality';
END $$;