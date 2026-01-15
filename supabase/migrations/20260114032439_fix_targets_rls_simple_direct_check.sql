/*
  # Fix targets RLS policies with direct simple check

  ## Problem
  - can_manage_targets helper function returns true in debug but RLS still blocks
  - Need simpler, more direct RLS policies

  ## Solution
  - Drop all existing targets policies
  - Create new simple policies that directly check organization_members table
  - Use inline subqueries instead of helper functions
*/

-- Drop all existing policies on targets
DROP POLICY IF EXISTS "Managers can create targets" ON targets;
DROP POLICY IF EXISTS "Managers can update targets" ON targets;
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;
DROP POLICY IF EXISTS "Users can view targets" ON targets;
DROP POLICY IF EXISTS "targets_select_policy" ON targets;
DROP POLICY IF EXISTS "targets_insert_policy" ON targets;
DROP POLICY IF EXISTS "targets_update_policy" ON targets;
DROP POLICY IF EXISTS "targets_delete_policy" ON targets;

-- SELECT: Users can view targets for stores they have access to
CREATE POLICY "targets_select_for_org_members"
ON targets FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

-- INSERT: Owner, admin, manager can create targets
CREATE POLICY "targets_insert_for_managers"
ON targets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = targets.organization_id
      AND om.role IN ('owner', 'admin', 'manager')
  )
);

-- UPDATE: Owner, admin, manager can update targets
CREATE POLICY "targets_update_for_managers"
ON targets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = targets.organization_id
      AND om.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = targets.organization_id
      AND om.role IN ('owner', 'admin', 'manager')
  )
);

-- DELETE: Owner, admin, manager can delete targets
CREATE POLICY "targets_delete_for_managers"
ON targets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = targets.organization_id
      AND om.role IN ('owner', 'admin', 'manager')
  )
);
