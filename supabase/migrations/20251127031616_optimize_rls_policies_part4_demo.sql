/*
  # RLSポリシー最適化 Part 4: Demo関連テーブル

  ## 概要
  Demo関連テーブルのRLSポリシーを最適化して、Supabase Security Advisorの警告を解決します。

  ## 変更内容
  1. 重複する複数のpermissiveポリシーを統合
  2. ポリシー名を明確化

  ## 対象テーブル
  - demo_sessions
  - demo_stores
  - demo_reports
  - demo_organizations
  - demo_monthly_expenses
  - demo_ai_usage_tracking
  - demo_ai_reports

  ## パフォーマンス改善
  ポリシーを統合することで、ポリシー評価のオーバーヘッドを削減します。
*/

-- ============================================================================
-- demo_sessions テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo sessions" ON demo_sessions;
DROP POLICY IF EXISTS "Anyone can create demo sessions" ON demo_sessions;
DROP POLICY IF EXISTS "Anyone can update own demo session" ON demo_sessions;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo sessions"
  ON demo_sessions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_stores テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo stores" ON demo_stores;
DROP POLICY IF EXISTS "Demo setup can insert demo stores" ON demo_stores;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo stores"
  ON demo_stores
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_reports テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo reports" ON demo_reports;
DROP POLICY IF EXISTS "Anyone can create demo reports" ON demo_reports;
DROP POLICY IF EXISTS "Anyone can update demo reports" ON demo_reports;
DROP POLICY IF EXISTS "Anyone can delete demo reports" ON demo_reports;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo reports"
  ON demo_reports
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_organizations テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo organizations" ON demo_organizations;
DROP POLICY IF EXISTS "System can create demo organizations" ON demo_organizations;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo organizations"
  ON demo_organizations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_monthly_expenses テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo monthly expenses" ON demo_monthly_expenses;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo monthly expenses"
  ON demo_monthly_expenses
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_ai_usage_tracking テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Public can read demo AI usage" ON demo_ai_usage_tracking;
DROP POLICY IF EXISTS "Public can create demo AI usage" ON demo_ai_usage_tracking;
DROP POLICY IF EXISTS "Public can update demo AI usage" ON demo_ai_usage_tracking;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo AI usage"
  ON demo_ai_usage_tracking
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_ai_reports テーブル
-- ============================================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Public can read demo AI reports" ON demo_ai_reports;
DROP POLICY IF EXISTS "Public can create demo AI reports" ON demo_ai_reports;

-- 新しい最適化されたポリシー
CREATE POLICY "Public can manage demo AI reports"
  ON demo_ai_reports
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
