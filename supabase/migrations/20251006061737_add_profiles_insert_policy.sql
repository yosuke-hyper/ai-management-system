/*
  # プロファイルINSERTポリシー追加

  ## 概要
  新規ユーザーが自分のプロファイルを作成できるようにINSERTポリシーを追加

  ## 変更内容
  1. 認証済みユーザーが自分のIDでプロファイルを作成可能
  2. 既存ユーザーのプロファイルを補完
*/

-- ============================================
-- 1. INSERTポリシー追加
-- ============================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. 既存ユーザーのプロファイル補完
-- ============================================

INSERT INTO public.profiles (id, name, email, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE((au.raw_user_meta_data->>'role')::text, 'staff')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- ============================================
-- 3. 確認
-- ============================================

DO $$
DECLARE
  profile_count INTEGER;
  auth_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  
  RAISE NOTICE '✅ プロファイルINSERTポリシー作成完了';
  RAISE NOTICE '📊 auth.users: % 人', auth_count;
  RAISE NOTICE '📊 profiles: % 人', profile_count;
END $$;
