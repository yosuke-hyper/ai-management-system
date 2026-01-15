/*
  # Fix AI Usage Settings RLS Policies

  ## Problem
  The ai_usage_settings table is missing an INSERT policy, which prevents
  upsert operations from creating new records. Additionally, existing policies
  don't properly check organization_id.

  ## Changes
  1. Drop old policies that don't check organization_id
  2. Create new policies with proper organization_id checks:
     - SELECT: Users can view their organization's settings
     - INSERT: Admins can create settings for their organization
     - UPDATE: Admins can update settings for their organization

  ## Security
  - All policies require authentication
  - INSERT/UPDATE policies verify admin role
  - All policies verify organization membership
*/

-- ============================================
-- 1. Drop old policies
-- ============================================

DROP POLICY IF EXISTS "Admins can update usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Anyone can view usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Users can view own org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can update own org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can insert own org ai usage settings" ON ai_usage_settings;

-- ============================================
-- 2. Create new policies with organization checks
-- ============================================

-- SELECT: Organization members can view their org's settings
CREATE POLICY "Users can view org ai usage settings"
ON ai_usage_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = ai_usage_settings.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- INSERT: Admins can create settings for their organization
CREATE POLICY "Admins can insert org ai usage settings"
ON ai_usage_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.organization_id = ai_usage_settings.organization_id
    AND om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- UPDATE: Admins can update settings for their organization
CREATE POLICY "Admins can update org ai usage settings"
ON ai_usage_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.organization_id = ai_usage_settings.organization_id
    AND om.user_id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.organization_id = ai_usage_settings.organization_id
    AND om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ============================================
-- 3. Verify RLS is enabled
-- ============================================

ALTER TABLE ai_usage_settings ENABLE ROW LEVEL SECURITY;
