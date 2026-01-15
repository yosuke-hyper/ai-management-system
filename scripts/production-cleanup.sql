/*
  本番公開前データクリーンアップスクリプト

  ⚠️ 実行前に必ずバックアップを取ってください

  このスクリプトは以下を削除します：
  1. テスト・デモ組織
  2. 期限切れデモセッション
  3. サンプルデータ（is_sample=true）
  4. エラーログ（オプション）
  5. 古いAI使用履歴
*/

-- ============================================
-- 1. 現在の状態を確認（削除前）
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 削除前のデータ確認';
  RAISE NOTICE '========================================';
END $$;

SELECT
  '組織数' as item,
  count(*)::text as count
FROM organizations
UNION ALL
SELECT
  'デモ組織' as item,
  count(*)::text as count
FROM organizations WHERE is_demo = true
UNION ALL
SELECT
  '日報総数' as item,
  count(*)::text as count
FROM daily_reports
UNION ALL
SELECT
  'サンプル日報' as item,
  count(*)::text as count
FROM daily_reports WHERE is_sample = true
UNION ALL
SELECT
  'エラーログ' as item,
  count(*)::text as count
FROM error_logs
UNION ALL
SELECT
  'デモセッション' as item,
  count(*)::text as count
FROM demo_sessions;

-- ============================================
-- 2. デモ組織を削除（CASCADE で関連データも削除）
-- ============================================

DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  デモ組織を削除中...';
  RAISE NOTICE '========================================';

  DELETE FROM organizations
  WHERE is_demo = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %個のデモ組織を削除しました', deleted_count;
END $$;

-- ============================================
-- 3. テスト組織を削除（任意）
-- ============================================

-- ⚠️ "Test Organization" を削除する場合はコメントを外してください
/*
DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  テスト組織を削除中...';
  RAISE NOTICE '========================================';

  DELETE FROM organizations
  WHERE name ILIKE '%test%'
     OR slug LIKE 'test-%';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %個のテスト組織を削除しました', deleted_count;
END $$;
*/

-- ============================================
-- 4. サンプルデータ（is_sample=true）を削除
-- ============================================

DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  サンプルデータを削除中...';
  RAISE NOTICE '========================================';

  DELETE FROM daily_reports
  WHERE is_sample = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %件のサンプル日報を削除しました', deleted_count;
END $$;

-- ============================================
-- 5. 期限切れデモセッションを削除
-- ============================================

DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  期限切れデモセッションを削除中...';
  RAISE NOTICE '========================================';

  DELETE FROM demo_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %件の期限切れデモセッションを削除しました', deleted_count;
END $$;

-- ============================================
-- 6. エラーログを削除（オプション）
-- ============================================

-- ⚠️ エラーログを削除する場合はコメントを外してください
-- 開発時のエラーログは削除してもOKですが、本番で役立つ場合もあります
/*
DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  エラーログを削除中...';
  RAISE NOTICE '========================================';

  -- 90日より古いエラーログのみ削除（最近のログは保持）
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %件のエラーログを削除しました', deleted_count;
END $$;
*/

-- ============================================
-- 7. 監査ログを削除（オプション）
-- ============================================

-- ⚠️ 監査ログを削除する場合はコメントを外してください
-- セキュリティ上、監査ログは保持することを推奨します
/*
DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  古い監査ログを削除中...';
  RAISE NOTICE '========================================';

  -- 180日より古い監査ログのみ削除
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %件の監査ログを削除しました', deleted_count;
END $$;
*/

-- ============================================
-- 8. AI会話履歴を削除（オプション）
-- ============================================

-- ⚠️ AI会話履歴を削除する場合はコメントを外してください
/*
DO $$
DECLARE
  deleted_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🗑️  古いAI会話履歴を削除中...';
  RAISE NOTICE '========================================';

  -- 30日より古いAI会話履歴のみ削除
  DELETE FROM ai_conversations
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ %件のAI会話を削除しました', deleted_count;
END $$;
*/

-- ============================================
-- 9. データ整合性チェック
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 データ整合性チェック';
  RAISE NOTICE '========================================';
END $$;

-- 組織に紐づかないデータをチェック
SELECT
  'organization_idがNULLの日報' as check_item,
  count(*)::text as issue_count
FROM daily_reports
WHERE organization_id IS NULL
UNION ALL
SELECT
  'organization_idがNULLの店舗' as check_item,
  count(*)::text as issue_count
FROM stores
WHERE organization_id IS NULL
UNION ALL
SELECT
  '組織メンバーシップがないユーザー' as check_item,
  count(*)::text as issue_count
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.user_id = p.id
)
AND p.id NOT IN (SELECT user_id FROM system_admins);

-- ============================================
-- 10. 削除後の状態を確認
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 削除後のデータ確認';
  RAISE NOTICE '========================================';
END $$;

SELECT
  '残存組織数' as item,
  count(*)::text as count
FROM organizations
UNION ALL
SELECT
  'デモ組織（残存）' as item,
  count(*)::text as count
FROM organizations WHERE is_demo = true
UNION ALL
SELECT
  '日報総数' as item,
  count(*)::text as count
FROM daily_reports
UNION ALL
SELECT
  'サンプル日報（残存）' as item,
  count(*)::text as count
FROM daily_reports WHERE is_sample = true
UNION ALL
SELECT
  'エラーログ' as item,
  count(*)::text as count
FROM error_logs
UNION ALL
SELECT
  'デモセッション' as item,
  count(*)::text as count
FROM demo_sessions;

-- ============================================
-- 11. 完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ クリーンアップ完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. 上記の結果を確認してください';
  RAISE NOTICE '2. 問題がなければ、本番環境にデプロイできます';
  RAISE NOTICE '3. 新規ユーザーは独立した組織で登録されます';
  RAISE NOTICE '4. 各組織のデータは完全に隔離されています';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  注意事項:';
  RAISE NOTICE '- バックアップを必ず保管してください';
  RAISE NOTICE '- 本番環境では定期的にバックアップを取ってください';
  RAISE NOTICE '- デモ組織は自動的に期限切れ後7日で削除されます';
  RAISE NOTICE '========================================';
END $$;
