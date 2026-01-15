/*
  # Fix Organization Creation Trigger Timing

  1. Problem
    - `on_profile_created_create_organization` trigger runs BEFORE INSERT
    - This causes foreign key constraint errors when inserting into organization_members
    - The profile record hasn't been committed yet, so FK constraint fails
    - Function catches exception silently, leaving user without an organization

  2. Solution
    - Change trigger timing from BEFORE INSERT to AFTER INSERT
    - Profile record is committed before trigger runs
    - Can now safely insert into organization_members with FK constraint

  3. Changes
    - Drop old BEFORE trigger
    - Create new AFTER trigger
    - Update function to work with AFTER trigger (updates profile after creation)
*/

-- Drop the existing BEFORE trigger
DROP TRIGGER IF EXISTS on_profile_created_create_organization ON public.profiles;

-- Update the function to work as AFTER trigger
CREATE OR REPLACE FUNCTION public.create_organization_for_new_profile_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
  existing_org_id uuid;
  user_metadata jsonb;
  starter_plan_id uuid;
  trial_period_days int := 14;
BEGIN
  -- Check if profile already has organization_id set
  IF NEW.organization_id IS NOT NULL THEN
    RAISE NOTICE 'Profile already has organization_id, skipping auto-creation';
    RETURN NEW;
  END IF;

  -- Check if user is already member of an organization
  SELECT organization_id INTO existing_org_id
  FROM public.organization_members
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    -- Update profile with existing organization
    UPDATE public.profiles
    SET organization_id = existing_org_id,
        updated_at = now()
    WHERE id = NEW.id;
    
    RAISE NOTICE '✅ Using existing organization: %', existing_org_id;
    RETURN NEW;
  END IF;

  -- Get user metadata from auth.users
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.id;

  -- Determine organization name
  org_name := COALESCE(
    user_metadata->>'organizationName',
    COALESCE(NEW.name, NEW.email, 'ユーザー') || 'の組織'
  );

  -- Generate slug
  org_slug := 'org-' || substring(NEW.id::text from 1 for 8);

  -- Avoid slug collision
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
    org_slug := 'org-' || substring(NEW.id::text from 1 for 8) || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Get Starter monthly plan
  SELECT id INTO starter_plan_id
  FROM public.subscription_plans
  WHERE name = 'starter' AND billing_cycle = 'monthly' AND is_active = true
  LIMIT 1;

  IF starter_plan_id IS NULL THEN
    RAISE WARNING '⚠️ Starter monthly plan not found, cannot create organization';
    RETURN NEW;
  END IF;

  -- Create new organization
  INSERT INTO public.organizations (
    name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    max_stores,
    max_users,
    max_ai_requests_per_month
  ) VALUES (
    org_name,
    org_slug,
    COALESCE(NEW.email, 'noreply@example.com'),
    'trial',
    'starter',
    now() + interval '14 days',
    1,
    5,
    50
  )
  RETURNING id INTO new_org_id;

  RAISE NOTICE '✅ Created organization: % (ID: %) for user: %', org_name, new_org_id, NEW.id;

  -- Add user as organization owner
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_org_id,
    NEW.id,
    'owner',
    now()
  );

  RAISE NOTICE '✅ Added user as organization owner';

  -- Create trial subscription
  INSERT INTO public.organization_subscriptions (
    organization_id,
    plan_id,
    status,
    started_at,
    current_period_end,
    trial_end
  ) VALUES (
    new_org_id,
    starter_plan_id,
    'trial',
    now(),
    now() + (trial_period_days || ' days')::interval,
    now() + (trial_period_days || ' days')::interval
  );

  RAISE NOTICE '✅ Created trial subscription (Starter monthly) for organization: %', new_org_id;

  -- Update profile with organization_id
  UPDATE public.profiles
  SET organization_id = new_org_id,
      updated_at = now()
  WHERE id = NEW.id;

  RAISE NOTICE '✅ Updated profile with organization_id';

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create organization for profile %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create new AFTER INSERT trigger
CREATE TRIGGER on_profile_created_create_organization
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_organization_for_new_profile_after();
