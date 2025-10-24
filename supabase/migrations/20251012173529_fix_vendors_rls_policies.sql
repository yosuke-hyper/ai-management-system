/*
  # vendorsテーブルのRLSポリシー修正

  1. 変更内容
    - 重複・競合しているポリシーを削除
    - 組織ベースの正しいポリシーのみを残す
  
  2. 修正されるポリシー
    - 古い "Users can read vendors" ポリシーを削除
    - 古い "Managers can manage vendors" ポリシーを削除
    - 組織ベースのポリシー (vendors_select, vendors_insert, vendors_update, vendors_delete) を維持

  3. セキュリティ
    - ユーザーは自分の組織のvendorsのみ閲覧可能
    - 管理者のみvendorsの作成・更新・削除が可能
*/

-- 古いポリシーを削除
DROP POLICY IF EXISTS "Users can read vendors" ON vendors;
DROP POLICY IF EXISTS "Managers can manage vendors" ON vendors;

-- 既存の組織ベースのポリシーを維持（すでに存在）
-- vendors_select: 自組織のvendorsを閲覧可能
-- vendors_insert: 管理者のみvendorsを作成可能
-- vendors_update: 管理者のみvendorsを更新可能
-- vendors_delete: 管理者のみvendorsを削除可能
