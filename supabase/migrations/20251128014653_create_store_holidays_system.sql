/*
  # 店舗休日管理システムの作成

  1. 新しいテーブル
    - `store_regular_closed_days` - 定休日（曜日ベース）
      - `id` (uuid, primary key)
      - `store_id` (uuid, 店舗ID)
      - `day_of_week` (integer, 0=日曜, 1=月曜, ..., 6=土曜)
      - `organization_id` (uuid, 組織ID)
      - `created_at` (timestamp)

    - `store_holidays` - 特定日の休日・臨時休業
      - `id` (uuid, primary key)
      - `store_id` (uuid, 店舗ID)
      - `date` (date, 休日の日付)
      - `type` (text, 'national_holiday' | 'temporary_closure' | 'special_event')
      - `reason` (text, 理由・メモ)
      - `organization_id` (uuid, 組織ID)
      - `created_at` (timestamp)

  2. セキュリティ
    - 各テーブルでRLSを有効化
    - 組織メンバーのみがデータにアクセス可能
    - ownerとadminは作成・更新・削除が可能
    - managerとstaffは閲覧のみ

  3. インデックス
    - 効率的なクエリのためのインデックスを追加
*/

-- store_regular_closed_days テーブルの作成
CREATE TABLE IF NOT EXISTS store_regular_closed_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, day_of_week)
);

-- store_holidays テーブルの作成
CREATE TABLE IF NOT EXISTS store_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('national_holiday', 'temporary_closure', 'special_event')),
  reason text,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, date)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_store_regular_closed_days_store ON store_regular_closed_days(store_id);
CREATE INDEX IF NOT EXISTS idx_store_regular_closed_days_org ON store_regular_closed_days(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_holidays_store ON store_holidays(store_id);
CREATE INDEX IF NOT EXISTS idx_store_holidays_org ON store_holidays(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_holidays_date ON store_holidays(date);

-- RLSの有効化
ALTER TABLE store_regular_closed_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_holidays ENABLE ROW LEVEL SECURITY;

-- store_regular_closed_days のRLSポリシー

-- SELECT: 組織メンバーは閲覧可能
CREATE POLICY "Organization members can view regular closed days"
  ON store_regular_closed_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_regular_closed_days.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- INSERT: ownerとadminのみ作成可能
CREATE POLICY "Owners and admins can create regular closed days"
  ON store_regular_closed_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_regular_closed_days.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- UPDATE: ownerとadminのみ更新可能
CREATE POLICY "Owners and admins can update regular closed days"
  ON store_regular_closed_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_regular_closed_days.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: ownerとadminのみ削除可能
CREATE POLICY "Owners and admins can delete regular closed days"
  ON store_regular_closed_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_regular_closed_days.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- store_holidays のRLSポリシー

-- SELECT: 組織メンバーは閲覧可能
CREATE POLICY "Organization members can view holidays"
  ON store_holidays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_holidays.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- INSERT: ownerとadminのみ作成可能
CREATE POLICY "Owners and admins can create holidays"
  ON store_holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_holidays.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- UPDATE: ownerとadminのみ更新可能
CREATE POLICY "Owners and admins can update holidays"
  ON store_holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_holidays.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: ownerとadminのみ削除可能
CREATE POLICY "Owners and admins can delete holidays"
  ON store_holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = store_holidays.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- 営業日数を自動計算する関数
CREATE OR REPLACE FUNCTION calculate_open_days(
  p_store_id uuid,
  p_year_month text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_days_in_month integer;
  v_open_days integer;
  v_current_date date;
  v_day_of_week integer;
  v_is_closed boolean;
BEGIN
  -- 年月を分解
  v_year := CAST(SPLIT_PART(p_year_month, '-', 1) AS integer);
  v_month := CAST(SPLIT_PART(p_year_month, '-', 2) AS integer);
  
  -- その月の日数を取得
  v_days_in_month := EXTRACT(DAY FROM (DATE(v_year || '-' || v_month || '-01') + INTERVAL '1 month - 1 day'));
  
  v_open_days := 0;
  
  -- 各日をチェック
  FOR i IN 1..v_days_in_month LOOP
    v_current_date := DATE(v_year || '-' || LPAD(v_month::text, 2, '0') || '-' || LPAD(i::text, 2, '0'));
    v_day_of_week := EXTRACT(DOW FROM v_current_date); -- 0=日曜, 1=月曜, ..., 6=土曜
    v_is_closed := FALSE;
    
    -- 定休日チェック
    IF EXISTS (
      SELECT 1 FROM store_regular_closed_days
      WHERE store_id = p_store_id AND day_of_week = v_day_of_week
    ) THEN
      v_is_closed := TRUE;
    END IF;
    
    -- 特定日の休日チェック
    IF EXISTS (
      SELECT 1 FROM store_holidays
      WHERE store_id = p_store_id AND date = v_current_date
    ) THEN
      v_is_closed := TRUE;
    END IF;
    
    -- 営業日の場合はカウント
    IF NOT v_is_closed THEN
      v_open_days := v_open_days + 1;
    END IF;
  END LOOP;
  
  RETURN v_open_days;
END;
$$;
