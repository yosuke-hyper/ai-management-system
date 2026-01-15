/*
  # Add Default Value to vendor_categories.id Column

  1. Purpose
    - Add a default UUID generation to vendor_categories.id as a safety net
    - Even though the trigger function generates IDs, having a column default
      provides additional protection against NULL constraint violations

  2. Changes
    - Add DEFAULT gen_random_uuid()::text to vendor_categories.id column
*/

-- Add default value to vendor_categories.id as a safety net
ALTER TABLE public.vendor_categories
ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text);
