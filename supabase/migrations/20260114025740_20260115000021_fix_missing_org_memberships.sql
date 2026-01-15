/*
  # 既存ユーザーの組織メンバーシップを修正

  1. 問題
    - 既存のユーザーが organization_members に登録されていない
    - profiles に organization_id はあるが、members テーブルにエントリがない

  2. 解決策
    - profiles の organization_id を使って、欠けている members エントリを作成
    - role は profiles.role を使用（owner/admin/manager/staff）
*/

-- 欠けている organization_members エントリを作成
INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  joined_at
)
SELECT 
  p.organization_id,
  p.id as user_id,
  CASE 
    WHEN p.role IN ('owner', 'admin', 'manager', 'staff') THEN p.role
    ELSE 'staff'
  END as role,
  p.created_at as joined_at
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM public.organization_members om 
    WHERE om.user_id = p.id 
      AND om.organization_id = p.organization_id
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 結果を表示
DO $$
DECLARE
  fixed_count integer;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.profiles p
  WHERE p.organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.organization_members om 
      WHERE om.user_id = p.id 
        AND om.organization_id = p.organization_id
    );
  
  RAISE NOTICE '✅ Fixed organization memberships. Total users with memberships: %', fixed_count;
END $$;
