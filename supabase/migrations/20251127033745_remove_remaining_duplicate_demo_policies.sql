/*
  # Remove remaining duplicate demo table policies

  ## 概要
  Demoテーブルで重複しているポリシーを削除します。
  "Public can manage..." と "Public full access..." の両方が存在するため、
  より新しい "Public full access..." のみを保持します。

  ## 変更内容
  古い "Public can manage..." ポリシーを削除して、重複を解消します。
*/

-- ============================================================================
-- demo_sessions
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo sessions" ON demo_sessions;

-- ============================================================================
-- demo_stores
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo stores" ON demo_stores;

-- ============================================================================
-- demo_organizations
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo organizations" ON demo_organizations;

-- ============================================================================
-- demo_reports
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo reports" ON demo_reports;

-- ============================================================================
-- demo_ai_reports
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo AI reports" ON demo_ai_reports;

-- ============================================================================
-- demo_ai_usage_tracking
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo AI usage" ON demo_ai_usage_tracking;

-- ============================================================================
-- demo_monthly_expenses
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage demo monthly expenses" ON demo_monthly_expenses;
