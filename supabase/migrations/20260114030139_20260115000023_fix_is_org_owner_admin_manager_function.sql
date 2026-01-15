/*
  # is_org_owner_admin_manager 関数の修正

  1. 問題
    - 関数が正しく動作していない可能性
    - auth.uid() が NULL になっている

  2. 解決策
    - CREATE OR REPLACE で関数を更新
    - search_path を明示的に設定
*/

-- 関数を置き換え
CREATE OR REPLACE FUNCTION public.is_org_owner_admin_manager(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  has_permission boolean;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();
  
  -- ユーザーIDが NULL の場合は false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- organization_members をチェック
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE user_id = current_user_id
      AND organization_id = org_id
      AND role IN ('owner', 'admin', 'manager')
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.is_org_owner_admin_manager(uuid) IS 'ユーザーが指定された組織のオーナー、管理者、マネージャーかどうかを確認';

-- テスト用のクエリ（ログに出力）
DO $$
BEGIN
  RAISE NOTICE '✅ is_org_owner_admin_manager 関数を更新しました';
  RAISE NOTICE '📋 plpgsql に変更し、auth.uid() を明示的に取得します';
END $$;
