/*
  # 新規ユーザーに自動的にトライアルサブスクリプションを作成

  ## 問題
  - 組織は作成されるが、organization_subscriptions にトライアルプランが作成されない
  - そのため、プラン情報が表示されず、ユーザーが困惑する

  ## 解決策
  1. create_organization_for_new_profile() 関数を更新
  2. 組織作成時に Starter 月額プランのトライアルを自動作成
  3. 14日間のトライアル期間を設定

  ## 変更内容
  - 組織作成後、organization_subscriptions にトライアルレコードを追加
  - Starter 月額プランを自動割り当て
  - trial_end と current_period_end を14日後に設定
*/

-- ============================================
-- プロファイル作成時の組織自動作成関数（サブスクリプション追加版）
-- ============================================

CREATE OR REPLACE FUNCTION public.create_organization_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
  existing_org_id uuid;
  user_metadata jsonb;
  starter_plan_id uuid;
  trial_period_days int := 14;
BEGIN
  -- 既に organization_id が設定されている場合はスキップ
  IF NEW.organization_id IS NOT NULL THEN
    RAISE NOTICE 'Profile already has organization_id, skipping auto-creation';
    RETURN NEW;
  END IF;

  -- 既に organization_members に登録されているかチェック
  SELECT organization_id INTO existing_org_id
  FROM public.organization_members
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    -- 既存の組織があればそれを使用
    NEW.organization_id := existing_org_id;
    RAISE NOTICE '✅ Using existing organization: %', existing_org_id;
    RETURN NEW;
  END IF;

  -- auth.users からユーザーのメタデータを取得
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.id;

  -- 組織名を決定（優先順位: メタデータの organizationName > プロファイル名 + "の組織" > メールアドレス + "の組織"）
  org_name := COALESCE(
    user_metadata->>'organizationName',
    COALESCE(NEW.name, NEW.email, 'ユーザー') || 'の組織'
  );

  -- スラッグを生成
  org_slug := 'org-' || substring(NEW.id::text from 1 for 8);

  -- スラッグの重複を避けるため、既存チェック
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
    org_slug := 'org-' || substring(NEW.id::text from 1 for 8) || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- 新しい組織を作成
  INSERT INTO public.organizations (
    name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    max_stores,
    max_users,
    max_ai_requests_per_month
  ) VALUES (
    org_name,
    org_slug,
    COALESCE(NEW.email, 'noreply@example.com'),
    'trial',
    'starter',
    now() + interval '14 days',
    1,
    5,
    50
  )
  RETURNING id INTO new_org_id;

  RAISE NOTICE '✅ Created organization: % (ID: %) for user: %', org_name, new_org_id, NEW.id;

  -- organization_members にオーナーとして登録
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_org_id,
    NEW.id,
    'owner',
    now()
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RAISE NOTICE '✅ Added user as organization owner';

  -- Starter 月額プランのIDを取得
  SELECT id INTO starter_plan_id
  FROM public.subscription_plans
  WHERE name = 'starter' AND billing_cycle = 'monthly' AND is_active = true
  LIMIT 1;

  IF starter_plan_id IS NOT NULL THEN
    -- トライアルサブスクリプションを作成
    INSERT INTO public.organization_subscriptions (
      organization_id,
      plan_id,
      status,
      started_at,
      current_period_end,
      trial_end
    ) VALUES (
      new_org_id,
      starter_plan_id,
      'trial',
      now(),
      now() + (trial_period_days || ' days')::interval,
      now() + (trial_period_days || ' days')::interval
    );

    RAISE NOTICE '✅ Created trial subscription (Starter monthly) for organization: %', new_org_id;
  ELSE
    RAISE WARNING '⚠️ Starter monthly plan not found, subscription not created';
  END IF;

  -- プロファイルに organization_id を設定
  NEW.organization_id := new_org_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create organization for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_organization_for_new_profile() IS 'プロファイル作成時に組織とトライアルサブスクリプションを自動作成';

-- ============================================
-- 既存組織でサブスクリプションが無い場合に作成
-- ============================================

-- デモ以外の組織で、サブスクリプションが無い組織にトライアルを追加
INSERT INTO organization_subscriptions (organization_id, plan_id, status, started_at, current_period_end, trial_end)
SELECT
  o.id,
  (SELECT id FROM subscription_plans WHERE name = 'starter' AND billing_cycle = 'monthly' AND is_active = true LIMIT 1),
  'trial',
  now(),
  now() + interval '14 days',
  now() + interval '14 days'
FROM organizations o
WHERE o.is_demo = false
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os
    WHERE os.organization_id = o.id
  )
  AND (SELECT id FROM subscription_plans WHERE name = 'starter' AND billing_cycle = 'monthly' AND is_active = true LIMIT 1) IS NOT NULL
ON CONFLICT DO NOTHING;
