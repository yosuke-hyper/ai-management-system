/*
  # Auto-create Profile on User Registration

  1. Changes
    - Creates trigger function to automatically create profile when user signs up
    - Creates trigger on auth.users table
    - Backfills any missing profiles for existing users

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Only creates profile if it doesn't exist (ON CONFLICT DO NOTHING)
    - Sets default role to 'staff'
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run after user insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing users
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'staff')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
