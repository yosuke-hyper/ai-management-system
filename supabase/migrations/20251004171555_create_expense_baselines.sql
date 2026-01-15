/*
  # 参考経費（月次平均）テーブルの作成

  1. 新規テーブル
    - `expense_baselines`
      - 店舗×月ごとに参考となる月次経費の基準値を保存
      - 人件費、光熱費、販促費、清掃費、雑費、通信費、その他
      - 稼働日数（日割り計算用）
      - 日報入力時に参考KPIとして表示し、翌月の確定値入力まで利用

  2. セキュリティ
    - RLSを有効化
    - 閲覧：担当店舗のスタッフまたは管理者
    - 登録・更新：管理者またはマネージャー

  3. 用途
    - 日報入力時：食材費以外の経費を日割りで参考表示
    - ダッシュボード：実績KPIと参考KPIを切り替え表示
    - 翌月確定：monthly_expensesに確定値を入力して最終PLを作成
*/

-- 参考経費（月次平均）テーブル
CREATE TABLE IF NOT EXISTS expense_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM形式

  -- 人件費
  labor_cost_employee numeric DEFAULT 0,
  labor_cost_part_time numeric DEFAULT 0,

  -- その他経費
  utilities numeric DEFAULT 0,
  promotion numeric DEFAULT 0,
  cleaning numeric DEFAULT 0,
  misc numeric DEFAULT 0,
  communication numeric DEFAULT 0,
  others numeric DEFAULT 0,

  -- 稼働日数（日割り計算用）
  open_days int DEFAULT 30,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 店舗×月で一意
  UNIQUE(store_id, month)
);

-- RLSを有効化
ALTER TABLE expense_baselines ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー：担当店舗または管理者
CREATE POLICY "Users can view expense baselines for their stores"
  ON expense_baselines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
      AND store_assignments.store_id = expense_baselines.store_id
    )
  );

-- 登録ポリシー：管理者またはマネージャー
CREATE POLICY "Admins and managers can insert expense baselines"
  ON expense_baselines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 更新ポリシー：管理者またはマネージャー
CREATE POLICY "Admins and managers can update expense baselines"
  ON expense_baselines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 削除ポリシー：管理者またはマネージャー
CREATE POLICY "Admins and managers can delete expense baselines"
  ON expense_baselines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
