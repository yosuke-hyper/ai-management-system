/*
  # 招待リンクからの組織情報アクセスを許可

  ## 概要
  匿名ユーザーが招待リンクから組織情報を閲覧できるようにするためのポリシー追加

  ## 変更内容
  1. 新しいRLSポリシー
    - 匿名ユーザーが有効な招待トークンを持つ組織を閲覧できるポリシーを追加
    - セキュリティ: 招待が存在する組織のみアクセス可能

  ## 重要な注意事項
  - このポリシーは、匿名ユーザーが招待リンクを開いた際に組織名を表示するために必要
  - 招待が存在しない組織へのアクセスは拒否される
*/

-- 匿名ユーザーが招待を通じて組織情報を閲覧できるポリシー
CREATE POLICY "Anonymous users can view organizations with valid invitation"
  ON public.organizations
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_invitations
      WHERE status = 'pending'
      AND expires_at > now()
    )
  );
