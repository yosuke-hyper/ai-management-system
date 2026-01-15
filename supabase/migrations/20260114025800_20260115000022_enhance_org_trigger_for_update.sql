/*
  # 組織作成トリガーを UPDATE にも対応

  1. 変更
    - トリガーを INSERT と UPDATE の両方で発火するように変更
    - organization_id が NULL から 値に変わった時にメンバーシップを作成

  2. 目的
    - 既存ユーザーが後から組織に追加された時も自動でメンバーシップを作成
*/

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_profile_created_create_organization ON public.profiles;

-- INSERT と UPDATE の両方で発火するように再作成
CREATE TRIGGER on_profile_created_create_organization
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_organization_for_new_profile();

COMMENT ON TRIGGER on_profile_created_create_organization ON public.profiles IS 'プロファイル作成・更新時に組織を自動生成し、メンバーシップを作成するトリガー';

-- 既存のユーザーでorganization_idがないものに組織を作成
DO $$
DECLARE
  profile_record RECORD;
  new_org_id uuid;
  org_name text;
  org_slug text;
BEGIN
  FOR profile_record IN 
    SELECT id, name, email
    FROM public.profiles
    WHERE organization_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members om WHERE om.user_id = profiles.id
      )
  LOOP
    -- 組織名とスラッグを生成
    org_name := COALESCE(profile_record.name, profile_record.email, 'ユーザー') || 'の組織';
    org_slug := 'org-' || substring(profile_record.id::text from 1 for 8);
    
    -- スラッグの重複チェック
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
      org_slug := 'org-' || substring(profile_record.id::text from 1 for 8) || '-' || floor(random() * 1000)::text;
    END LOOP;
    
    -- 新しい組織を作成
    INSERT INTO public.organizations (
      name, slug, email,
      subscription_status, subscription_plan,
      trial_ends_at, max_stores, max_users, max_ai_requests_per_month
    ) VALUES (
      org_name, org_slug, COALESCE(profile_record.email, 'noreply@example.com'),
      'trial', 'starter',
      now() + interval '14 days', 3, 5, 100
    )
    RETURNING id INTO new_org_id;
    
    -- organization_members に登録
    INSERT INTO public.organization_members (
      organization_id, user_id, role, joined_at
    ) VALUES (
      new_org_id, profile_record.id, 'owner', now()
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- profiles を更新
    UPDATE public.profiles
    SET organization_id = new_org_id
    WHERE id = profile_record.id;
    
    RAISE NOTICE '✅ Created organization % for user %', new_org_id, profile_record.id;
  END LOOP;
END $$;
