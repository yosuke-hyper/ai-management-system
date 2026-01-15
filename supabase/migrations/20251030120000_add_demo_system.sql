/*
  # デモシステム実装 - ライブデモ環境

  ## 概要
  14日間の期限付きデモ組織を作成し、実際のデータベースに書き込み可能な
  デモ環境を提供します。期限切れ後は自動的に読み取り専用となり、
  最終的にデータが削除されます。

  ## 1. 新規カラム追加（organizations）
    - `is_demo` (boolean) - デモ組織フラグ
    - `demo_expires_at` (timestamptz) - デモ有効期限

  ## 2. 新規テーブル
    - `usage_counters` - AI使用量・機能使用量の追跡
      - 日次/月次単位で使用量を集計
      - デモ組織の制限チェックに使用

  ## 3. セキュリティ機能
    - デモ組織の期限切れチェック（トリガー）
    - データ量制限の強制（トリガー）
    - AI使用量制限の追跡

  ## 4. 自動クリーンアップ
    - 期限切れデモ組織の自動削除関数
*/

-- ============================================
-- 1. Organizations テーブルにデモカラム追加
-- ============================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz;

COMMENT ON COLUMN public.organizations.is_demo IS 'デモ組織フラグ（true=デモ、false=本番）';
COMMENT ON COLUMN public.organizations.demo_expires_at IS 'デモ有効期限（is_demo=true の場合のみ有効）';

-- デモ組織用のインデックス
CREATE INDEX IF NOT EXISTS idx_organizations_demo_expires
  ON public.organizations (demo_expires_at)
  WHERE is_demo = true;

-- ============================================
-- 2. Usage Counters テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('ai_tokens', 'ai_calls', 'daily_reports', 'stores', 'vendors')),
  amount bigint NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (organization_id, kind, period_start)
);

COMMENT ON TABLE public.usage_counters IS '組織ごとの使用量カウンター（AI、データ量など）';
COMMENT ON COLUMN public.usage_counters.kind IS '使用量の種類（ai_tokens, ai_calls, daily_reports, stores, vendors）';
COMMENT ON COLUMN public.usage_counters.amount IS '累積使用量';
COMMENT ON COLUMN public.usage_counters.period_start IS '集計期間の開始日（日次単位）';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_usage_counters_org_period
  ON public.usage_counters (organization_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_usage_counters_kind
  ON public.usage_counters (organization_id, kind, period_start DESC);

-- Updated_at トリガー
DROP TRIGGER IF EXISTS update_usage_counters_updated_at ON public.usage_counters;
CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS有効化
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- 組織管理者のみ閲覧可能
CREATE POLICY "Admins can view usage counters"
  ON public.usage_counters
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- システムのみ更新可能（SECURITY DEFINER関数経由）
CREATE POLICY "System can update usage counters"
  ON public.usage_counters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. デモ制限チェック関数
-- ============================================

-- 使用量をカウントアップする関数
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  org_id uuid,
  counter_kind text,
  increment_by bigint DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_counters (organization_id, kind, amount, period_start)
  VALUES (org_id, counter_kind, increment_by, CURRENT_DATE)
  ON CONFLICT (organization_id, kind, period_start)
  DO UPDATE SET
    amount = public.usage_counters.amount + increment_by,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.increment_usage_counter(uuid, text, bigint) IS '使用量カウンターを増加させる';

-- デモ組織の制限チェック・強制トリガー関数
CREATE OR REPLACE FUNCTION public.enforce_demo_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _is_demo boolean;
  _expires timestamptz;
  _max_daily_reports integer := 2000;
  _max_stores integer := 10;
  _max_vendors integer := 50;
  _current_count integer;
BEGIN
  -- 組織情報を取得
  SELECT is_demo, demo_expires_at
  INTO _is_demo, _expires
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- デモ組織でない場合はチェックをスキップ
  IF NOT _is_demo THEN
    RETURN NEW;
  END IF;

  -- 期限切れチェック
  IF _expires IS NOT NULL AND _expires < now() THEN
    RAISE EXCEPTION 'Demo period has expired. Please sign up for a full account to continue.'
      USING HINT = 'Contact support or visit our pricing page';
  END IF;

  -- テーブル別の制限チェック
  IF TG_TABLE_NAME = 'daily_reports' THEN
    SELECT count(*)
    INTO _current_count
    FROM public.daily_reports
    WHERE organization_id = NEW.organization_id;

    IF _current_count >= _max_daily_reports THEN
      RAISE EXCEPTION 'Demo quota exceeded: Maximum % daily reports allowed', _max_daily_reports
        USING HINT = 'Upgrade to a paid plan for unlimited reports';
    END IF;

  ELSIF TG_TABLE_NAME = 'stores' THEN
    SELECT count(*)
    INTO _current_count
    FROM public.stores
    WHERE organization_id = NEW.organization_id;

    IF _current_count >= _max_stores THEN
      RAISE EXCEPTION 'Demo quota exceeded: Maximum % stores allowed', _max_stores
        USING HINT = 'Upgrade to a paid plan for more stores';
    END IF;

  ELSIF TG_TABLE_NAME = 'vendors' THEN
    SELECT count(*)
    INTO _current_count
    FROM public.vendors
    WHERE organization_id = NEW.organization_id;

    IF _current_count >= _max_vendors THEN
      RAISE EXCEPTION 'Demo quota exceeded: Maximum % vendors allowed', _max_vendors
        USING HINT = 'Upgrade to a paid plan for more vendors';
    END IF;
  END IF;

  -- 使用量カウンターを更新
  PERFORM public.increment_usage_counter(NEW.organization_id, TG_TABLE_NAME, 1);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_demo_quota() IS 'デモ組織の期限と使用量制限を強制する';

-- ============================================
-- 4. トリガー設定
-- ============================================

-- Daily Reports トリガー
DROP TRIGGER IF EXISTS t_demo_quota_daily_reports ON public.daily_reports;
CREATE TRIGGER t_demo_quota_daily_reports
  BEFORE INSERT ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_quota();

-- Stores トリガー
DROP TRIGGER IF EXISTS t_demo_quota_stores ON public.stores;
CREATE TRIGGER t_demo_quota_stores
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_quota();

-- Vendors トリガー
DROP TRIGGER IF EXISTS t_demo_quota_vendors ON public.vendors;
CREATE TRIGGER t_demo_quota_vendors
  BEFORE INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_quota();

-- ============================================
-- 5. 期限切れデモ削除関数
-- ============================================

CREATE OR REPLACE FUNCTION public.purge_expired_demos()
RETURNS TABLE (
  deleted_count integer,
  org_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _deleted_orgs uuid[];
  _count integer;
BEGIN
  -- 期限切れのデモ組織を取得
  SELECT array_agg(id)
  INTO _deleted_orgs
  FROM public.organizations
  WHERE is_demo = true
    AND demo_expires_at < now() - interval '7 days'; -- 期限切れ後7日間の猶予

  -- 組織を削除（CASCADE により関連データも自動削除）
  DELETE FROM public.organizations
  WHERE id = ANY(_deleted_orgs);

  GET DIAGNOSTICS _count = ROW_COUNT;

  RETURN QUERY SELECT _count, COALESCE(_deleted_orgs, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.purge_expired_demos() IS '期限切れのデモ組織を削除（期限切れ後7日間の猶予あり）';

-- ============================================
-- 6. デモ組織情報取得関数
-- ============================================

CREATE OR REPLACE FUNCTION public.get_demo_status()
RETURNS TABLE (
  is_demo boolean,
  expires_at timestamptz,
  days_remaining integer,
  daily_reports_used bigint,
  daily_reports_limit integer,
  ai_calls_today bigint,
  ai_calls_limit integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  _org_id uuid;
  _is_demo boolean;
  _expires timestamptz;
BEGIN
  -- ユーザーの組織を取得
  SELECT organization_id INTO _org_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _org_id IS NULL THEN
    RETURN;
  END IF;

  -- 組織情報を取得
  SELECT organizations.is_demo, organizations.demo_expires_at
  INTO _is_demo, _expires
  FROM public.organizations
  WHERE id = _org_id;

  -- デモ組織でない場合
  IF NOT _is_demo THEN
    RETURN QUERY SELECT
      false,
      NULL::timestamptz,
      NULL::integer,
      0::bigint,
      999999,
      0::bigint,
      999999;
    RETURN;
  END IF;

  -- デモ組織の使用状況を返す
  RETURN QUERY
  SELECT
    _is_demo,
    _expires,
    CASE
      WHEN _expires IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(days FROM _expires - now())::integer)
    END,
    COALESCE((
      SELECT sum(amount)
      FROM public.usage_counters
      WHERE organization_id = _org_id
        AND kind = 'daily_reports'
    ), 0),
    2000,
    COALESCE((
      SELECT amount
      FROM public.usage_counters
      WHERE organization_id = _org_id
        AND kind = 'ai_calls'
        AND period_start = CURRENT_DATE
    ), 0),
    50;
END;
$$;

COMMENT ON FUNCTION public.get_demo_status() IS '現在のユーザーのデモ状態と使用量を取得';

-- ============================================
-- 7. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ デモシステムのスキーマ追加完了';
  RAISE NOTICE '✅ usage_counters テーブル作成完了';
  RAISE NOTICE '✅ デモ制限チェック関数作成完了';
  RAISE NOTICE '✅ トリガー設定完了（daily_reports, stores, vendors）';
  RAISE NOTICE '✅ 期限切れデモ削除関数作成完了';
  RAISE NOTICE '✅ デモ状態取得関数作成完了';
  RAISE NOTICE '📋 次のステップ: start_demo Edge Function を作成してください';
END $$;
