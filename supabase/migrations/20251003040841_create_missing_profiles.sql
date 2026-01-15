/*
  # Create missing profiles for existing users

  1. Changes
    - Create profile records for all existing auth users who don't have profiles
    - Set default role as 'admin' for the first user, 'staff' for others
    - Use email as name if no name is available

  2. Security
    - Profiles are created with proper user IDs from auth.users
*/

-- Create profiles for existing auth users who don't have profiles
INSERT INTO profiles (id, name, email, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
  u.email,
  CASE 
    WHEN u.created_at = (SELECT MIN(created_at) FROM auth.users) THEN 'admin'::text
    ELSE 'staff'::text
  END as role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
