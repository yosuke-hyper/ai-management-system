/*
  # get_demo_status関数の型エラー修正

  1. 変更内容
    - sum(amount)の結果を明示的にbigintにキャスト
    - numeric型からbigint型への変換を明示的に行う

  2. セキュリティ
    - 既存のセキュリティポリシーを維持
*/

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
      SELECT sum(amount)::bigint
      FROM public.usage_counters
      WHERE organization_id = _org_id
        AND kind = 'daily_reports'
    ), 0::bigint),
    2000,
    COALESCE((
      SELECT amount::bigint
      FROM public.usage_counters
      WHERE organization_id = _org_id
        AND kind = 'ai_calls'
        AND period_start = CURRENT_DATE
    ), 0::bigint),
    50;
END;
$$;