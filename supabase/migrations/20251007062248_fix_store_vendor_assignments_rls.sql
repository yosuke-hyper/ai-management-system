/*
  # store_vendor_assignments RLSポリシーの修正

  1. 問題点
    - 現在のポリシーでは、管理者が店舗に割り当てられていない場合、業者割り当てができない
    - 管理者は全店舗に対して業者割り当てができるべき

  2. 修正内容
    - INSERT/UPDATE/DELETE ポリシーで is_admin() の場合は店舗割り当てチェックをスキップ
    - SELECT ポリシーで is_admin() の場合は全データを閲覧可能

  3. セキュリティ
    - 管理者: 全店舗の業者割り当てを管理可能
    - マネージャー: 割り当てられた店舗のみ管理可能
    - スタッフ: 割り当てられた店舗のみ閲覧可能
*/

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can read assignments for accessible stores" ON store_vendor_assignments;
DROP POLICY IF EXISTS "Managers can manage vendor assignments" ON store_vendor_assignments;

-- SELECT: 管理者は全店舗、その他は割り当てられた店舗のみ
CREATE POLICY "sva_select" ON store_vendor_assignments
FOR SELECT
TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = store_vendor_assignments.store_id
      AND sa.user_id = auth.uid()
  )
);

-- INSERT: 管理者は全店舗、マネージャーは割り当てられた店舗のみ
CREATE POLICY "sva_insert" ON store_vendor_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = store_vendor_assignments.store_id
    )
  )
);

-- UPDATE: 管理者は全店舗、マネージャーは割り当てられた店舗のみ
CREATE POLICY "sva_update" ON store_vendor_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = store_vendor_assignments.store_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = store_vendor_assignments.store_id
    )
  )
);

-- DELETE: 管理者は全店舗、マネージャーは割り当てられた店舗のみ
CREATE POLICY "sva_delete" ON store_vendor_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = store_vendor_assignments.store_id
    )
  )
);
