/*
  # Enhance Organization Creation Trigger to Handle UPDATE

  1. Purpose
    - Change trigger from AFTER INSERT to AFTER INSERT OR UPDATE
    - Handle cases where profile might be created via UPDATE (edge case)
    - Only run organization creation logic if organization_id is NULL

  2. Changes
    - Drop existing AFTER INSERT trigger
    - Create new AFTER INSERT OR UPDATE trigger
    - Function already handles the case where organization_id is set
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_profile_created_create_organization ON public.profiles;

-- Create enhanced trigger that also handles UPDATE
CREATE TRIGGER on_profile_created_create_organization
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.organization_id IS NULL)
  EXECUTE FUNCTION public.create_organization_for_new_profile_after();
