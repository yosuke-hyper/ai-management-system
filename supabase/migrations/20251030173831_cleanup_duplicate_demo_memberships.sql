/*
  # 重複したデモ組織メンバーシップのクリーンアップ

  1. 変更内容
    - is_demo = false の組織メンバーシップを削除（デモユーザーの場合）
    - デモユーザーは is_demo = true の組織のみに所属させる

  2. セキュリティ
    - デモユーザーのみが対象
    - データ整合性を保つ
*/

-- デモユーザーの重複した組織メンバーシップを削除
DELETE FROM public.organization_members
WHERE user_id IN (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.raw_user_meta_data->>'is_demo_user' = 'true'
)
AND organization_id IN (
  SELECT id 
  FROM public.organizations 
  WHERE is_demo = false
);