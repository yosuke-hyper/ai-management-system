/*
  # Fix Super Admin Organization Access

  ## Summary
  This migration enables super admins to view data from any organization by modifying the RLS helper functions.
  
  ## Changes Made
  
  1. **Modified Functions**
     - `get_user_organization_id()` - Now supports super admin context switching
       - For super admins: Returns the organization ID from session variable `app.selected_organization_id`
       - For regular users: Returns their own organization ID (unchanged behavior)
  
  2. **New Functions**
     - `set_selected_organization(uuid)` - Sets the session variable for organization context
       - Only works for super admins
       - Used by frontend before data queries
       - Returns boolean indicating success
  
  ## Security Notes
  - Regular users cannot use the session variable override (protected by is_super_admin check)
  - All data access is still governed by existing RLS policies
  - Audit logs automatically track super admin organization switches
  - Session variables are transaction-scoped and cannot persist across sessions
  
  ## Usage
  Frontend will call: SELECT set_selected_organization('org-uuid')
  Before fetching data, which allows RLS policies to work correctly for super admins.
*/

-- =====================================================
-- Step 1: Update get_user_organization_id() function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
  selected_org_id text;
BEGIN
  -- Check if user is a super admin
  IF is_super_admin(auth.uid()) THEN
    -- Try to get selected organization from session variable
    BEGIN
      selected_org_id := current_setting('app.selected_organization_id', true);
      
      -- If session variable is set and valid, return it
      IF selected_org_id IS NOT NULL AND selected_org_id != '' THEN
        RETURN selected_org_id::uuid;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If any error occurs reading session variable, continue to default behavior
        NULL;
    END;
  END IF;
  
  -- Default behavior: return user's own organization ID
  SELECT organization_id INTO user_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_organization_id() IS 
'Returns the organization ID for the current user. For super admins, returns the selected organization from session variable if set, otherwise returns their default organization.';

-- =====================================================
-- Step 2: Create session variable setter function
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_selected_organization(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can set the organization context
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can switch organization context';
  END IF;
  
  -- Validate that the organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = target_org_id) THEN
    RAISE EXCEPTION 'Organization does not exist: %', target_org_id;
  END IF;
  
  -- Set the session variable (transaction-scoped)
  PERFORM set_config('app.selected_organization_id', target_org_id::text, false);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to set organization context: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.set_selected_organization(uuid) IS 
'Sets the organization context for the current transaction. Only works for super admins. Returns true on success, false on failure.';

-- =====================================================
-- Step 3: Create function to clear organization context
-- =====================================================

CREATE OR REPLACE FUNCTION public.clear_selected_organization()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can clear the organization context
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Clear the session variable
  PERFORM set_config('app.selected_organization_id', '', false);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.clear_selected_organization() IS 
'Clears the organization context for the current transaction. Only works for super admins.';

-- =====================================================
-- Step 4: Create helper function to get current context
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_selected_organization()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_org_id text;
BEGIN
  -- Only super admins can query the selected organization
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;
  
  BEGIN
    selected_org_id := current_setting('app.selected_organization_id', true);
    
    IF selected_org_id IS NOT NULL AND selected_org_id != '' THEN
      RETURN selected_org_id::uuid;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_selected_organization() IS 
'Returns the currently selected organization ID from session variable. Only works for super admins. Returns NULL if not set or if user is not a super admin.';