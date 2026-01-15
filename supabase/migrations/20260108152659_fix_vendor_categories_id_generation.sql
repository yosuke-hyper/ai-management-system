/*
  # Fix Vendor Categories ID Generation

  1. Problem
    - vendor_categories.id is text NOT NULL but has no default value
    - create_default_vendor_categories() doesn't specify id in INSERT
    - This causes NULL constraint violation when creating organizations

  2. Solution
    - Update trigger function to generate UUIDs for id column
    - Use gen_random_uuid()::text for each category

  3. Changes
    - Update create_default_vendor_categories() function to include id values
*/

CREATE OR REPLACE FUNCTION public.create_default_vendor_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- vendor_categories が無い環境では何もしない
  IF to_regclass('public.vendor_categories') IS NULL THEN
    RETURN NEW;
  END IF;

  -- IDを明示的に生成してINSERT
  INSERT INTO public.vendor_categories (id, organization_id, name, display_order, is_active)
  VALUES
    (gen_random_uuid()::text, NEW.id, '青果', 1, true),
    (gen_random_uuid()::text, NEW.id, '精肉', 2, true),
    (gen_random_uuid()::text, NEW.id, '鮮魚', 3, true),
    (gen_random_uuid()::text, NEW.id, '乳製品', 4, true),
    (gen_random_uuid()::text, NEW.id, '冷凍食品', 5, true),
    (gen_random_uuid()::text, NEW.id, '調味料', 6, true),
    (gen_random_uuid()::text, NEW.id, '飲料', 7, true),
    (gen_random_uuid()::text, NEW.id, '消耗品', 8, true),
    (gen_random_uuid()::text, NEW.id, 'その他', 9, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
