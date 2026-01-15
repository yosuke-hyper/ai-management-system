/*
  # 日別売上目標テーブルの作成

  1. 新規テーブル
    - `daily_targets`
      - `id` (uuid, primary key) - レコードID
      - `store_id` (uuid, foreign key) - 店舗ID
      - `date` (date) - 対象日
      - `target_sales` (numeric) - 売上目標金額
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

  2. セキュリティ
    - RLSを有効化
    - 管理者（admin）：全店舗の日別目標の作成・読み取り・更新・削除が可能
    - 店長（manager）：担当店舗の日別目標の作成・読み取り・更新・削除が可能
    - スタッフ（staff）：担当店舗の日別目標の読み取りのみ可能

  3. 制約
    - store_idとdateの複合ユニーク制約（同じ店舗・同じ日付で重複登録を防止）
    - 外部キー制約でstoresテーブルと関連付け

  4. インデックス
    - store_idとdateの複合インデックスでクエリパフォーマンスを最適化
*/

-- テーブル作成
CREATE TABLE IF NOT EXISTS daily_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date date NOT NULL,
  target_sales numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT daily_targets_store_date_unique UNIQUE (store_id, date)
);

-- RLSを有効化
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_daily_targets_store_date ON daily_targets(store_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_targets_date ON daily_targets(date);

-- RLSポリシー: 管理者は全ての日別目標を読み取り可能
CREATE POLICY "Admins can view all daily targets"
  ON daily_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLSポリシー: 店長とスタッフは担当店舗の日別目標を読み取り可能
CREATE POLICY "Managers and staff can view their store daily targets"
  ON daily_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
      AND store_assignments.store_id = daily_targets.store_id
    )
  );

-- RLSポリシー: 管理者は全ての日別目標を作成可能
CREATE POLICY "Admins can create daily targets"
  ON daily_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLSポリシー: 店長は担当店舗の日別目標を作成可能
CREATE POLICY "Managers can create their store daily targets"
  ON daily_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_targets.store_id
      AND p.role = 'manager'
    )
  );

-- RLSポリシー: 管理者は全ての日別目標を更新可能
CREATE POLICY "Admins can update daily targets"
  ON daily_targets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLSポリシー: 店長は担当店舗の日別目標を更新可能
CREATE POLICY "Managers can update their store daily targets"
  ON daily_targets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_targets.store_id
      AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_targets.store_id
      AND p.role = 'manager'
    )
  );

-- RLSポリシー: 管理者は全ての日別目標を削除可能
CREATE POLICY "Admins can delete daily targets"
  ON daily_targets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLSポリシー: 店長は担当店舗の日別目標を削除可能
CREATE POLICY "Managers can delete their store daily targets"
  ON daily_targets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_targets.store_id
      AND p.role = 'manager'
    )
  );
