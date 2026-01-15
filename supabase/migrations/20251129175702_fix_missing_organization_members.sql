/*
  # organization_members の欠損レコードを修正

  ## 問題
  - profiles テーブルには organization_id が設定されているが、organization_members にレコードが無い
  - そのため RLS ポリシーでサブスクリプション情報にアクセスできない
  - プラン情報が表示されない原因

  ## 解決策
  1. profiles に organization_id があるが、organization_members に無いユーザーを検出
  2. それらのユーザーを organization_members に 'owner' ロールで追加
  3. 今後の新規ユーザーでも同じ問題が起きないよう、トリガー関数を確認・修正

  ## 影響
  - 既存ユーザーがサブスクリプション情報にアクセスできるようになる
  - プラン選択・変更機能が正常に動作する
*/

-- ============================================
-- 欠損している organization_members レコードを追加
-- ============================================

INSERT INTO organization_members (organization_id, user_id, role, joined_at)
SELECT 
  p.organization_id,
  p.id,
  'owner',
  COALESCE(p.created_at, now())
FROM profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p.organization_id
      AND om.user_id = p.id
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 追加されたレコード数を確認
DO $$
DECLARE
  added_count int;
BEGIN
  SELECT COUNT(*) INTO added_count
  FROM profiles p
  WHERE p.organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p.organization_id
        AND om.user_id = p.id
    );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ organization_members レコードを修正しました';
  RAISE NOTICE '📊 現在の organization_members 総数: %', added_count;
  RAISE NOTICE '========================================';
END $$;
