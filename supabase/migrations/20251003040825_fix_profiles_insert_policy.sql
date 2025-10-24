/*
  # Fix profiles table INSERT policy

  1. Changes
    - Add INSERT policy to allow users to create their own profile during signup
    - This fixes the issue where new users cannot complete registration

  2. Security
    - Users can only create a profile with their own auth.uid()
    - Users cannot create profiles for other users
*/

-- INSERT policy for profiles - allows users to create their own profile
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
