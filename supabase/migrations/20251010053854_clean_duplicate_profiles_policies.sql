/*
  # profilesテーブルの重複RLSポリシーを削除

  ## 問題
  古いポリシーと新しいポリシーが両方存在し、競合している

  ## 解決策
  古いポリシーを削除し、新しいポリシーのみを保持
*/

-- 古いポリシーを削除
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 新しいポリシーが既に存在するので、これで完了

DO $$
BEGIN
  RAISE NOTICE '✅ profiles テーブルの重複ポリシーを削除しました';
END $$;
