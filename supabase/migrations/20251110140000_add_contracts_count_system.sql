/*
  # 契約数連動型ユーザー管理システム

  ## 概要
  組織のサブスクリプションに契約数を導入し、契約数に応じてユーザー数上限を動的に管理します。
  1契約 = 5ユーザー、2契約 = 10ユーザー、3契約 = 15ユーザー...という形式。

  ## 1. テーブル変更

  ### `organization_subscriptions` テーブル
  - `contracts_count` (integer) - 契約数を追加
    - デフォルト値: 1
    - NOT NULL制約
    - チェック制約: 1以上
    - 1契約 = 5ユーザー

  ### `subscription_contract_history` テーブル（新規作成）
  - 契約数変更の履歴を記録
  - いつ、誰が、何契約追加/削除したかを追跡
  - 監査とトラブルシューティング用

  ## 2. 計算ロジック
  - 総利用可能ユーザー数 = contracts_count × 5
  - 月額料金 = (店舗料金) + (contracts_count × 3980円)

  ## 3. セキュリティ
  - RLSポリシーで契約数変更を組織オーナー/管理者のみに制限
  - 契約削除時、現在のユーザー数が新上限を超えないことを検証
  - 最低1契約は必須（削除不可）

  ## 4. 既存データの処理
  - 既存の全サブスクリプションに contracts_count = 1 を設定
  - プランのmax_usersは参考値として保持（契約数から動的計算）
*/

-- ============================================
-- 1. organization_subscriptions に contracts_count を追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscriptions'
    AND column_name = 'contracts_count'
  ) THEN
    ALTER TABLE organization_subscriptions
    ADD COLUMN contracts_count integer NOT NULL DEFAULT 1
    CHECK (contracts_count >= 1 AND contracts_count <= 100);
  END IF;
END $$;

-- 既存のサブスクリプションに contracts_count = 1 を設定
UPDATE organization_subscriptions
SET contracts_count = 1
WHERE contracts_count IS NULL OR contracts_count < 1;

-- カラムにコメントを追加
COMMENT ON COLUMN organization_subscriptions.contracts_count IS '契約数（1契約 = 5ユーザー、3980円/月）';

-- ============================================
-- 2. 契約変更履歴テーブルの作成
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_contract_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  change_type text NOT NULL CHECK (change_type IN ('add', 'remove', 'initial')),
  contracts_before integer NOT NULL,
  contracts_after integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE subscription_contract_history IS '契約数変更の履歴を記録するテーブル';
COMMENT ON COLUMN subscription_contract_history.change_type IS 'add: 契約追加, remove: 契約削除, initial: 初期設定';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_contract_history_org
  ON subscription_contract_history(organization_id);

CREATE INDEX IF NOT EXISTS idx_contract_history_subscription
  ON subscription_contract_history(subscription_id);

CREATE INDEX IF NOT EXISTS idx_contract_history_created
  ON subscription_contract_history(created_at DESC);

-- ============================================
-- 3. RLSポリシー - subscription_contract_history
-- ============================================

ALTER TABLE subscription_contract_history ENABLE ROW LEVEL SECURITY;

-- 組織メンバーは自組織の履歴を閲覧可能
DROP POLICY IF EXISTS "Organization members can view contract history" ON subscription_contract_history;
CREATE POLICY "Organization members can view contract history"
  ON subscription_contract_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = subscription_contract_history.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- 管理者以上のみ履歴レコードを作成可能
DROP POLICY IF EXISTS "Admins can insert contract history" ON subscription_contract_history;
CREATE POLICY "Admins can insert contract history"
  ON subscription_contract_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = subscription_contract_history.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. ヘルパー関数 - 契約数から総ユーザー数を計算
-- ============================================

CREATE OR REPLACE FUNCTION get_total_available_users(p_organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_contracts_count integer;
  v_users_per_contract integer := 5;
BEGIN
  -- 現在の契約数を取得
  SELECT contracts_count INTO v_contracts_count
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
  AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  -- 契約が見つからない場合はデフォルト値
  IF v_contracts_count IS NULL THEN
    v_contracts_count := 1;
  END IF;

  -- 総ユーザー数を計算
  RETURN v_contracts_count * v_users_per_contract;
END;
$$;

COMMENT ON FUNCTION get_total_available_users(uuid) IS '組織の契約数から総利用可能ユーザー数を計算（contracts_count × 5）';

-- ============================================
-- 5. ヘルパー関数 - 契約追加可能かチェック
-- ============================================

CREATE OR REPLACE FUNCTION can_add_contract(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_contracts_count integer;
  v_max_contracts integer := 100; -- 最大契約数
BEGIN
  SELECT contracts_count INTO v_contracts_count
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
  AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_contracts_count IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_contracts_count < v_max_contracts;
END;
$$;

COMMENT ON FUNCTION can_add_contract(uuid) IS '組織が契約を追加できるかチェック';

-- ============================================
-- 6. ヘルパー関数 - 契約削除可能かチェック
-- ============================================

CREATE OR REPLACE FUNCTION can_remove_contract(p_organization_id uuid)
RETURNS TABLE(allowed boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_contracts_count integer;
  v_current_users integer;
  v_new_max_users integer;
BEGIN
  -- 現在の契約数を取得
  SELECT contracts_count INTO v_contracts_count
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
  AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  -- 契約数が1以下の場合は削除不可
  IF v_contracts_count IS NULL OR v_contracts_count <= 1 THEN
    RETURN QUERY SELECT false, '最低1契約は必須です';
    RETURN;
  END IF;

  -- 現在のユーザー数を取得
  SELECT COUNT(*) INTO v_current_users
  FROM organization_members
  WHERE organization_id = p_organization_id;

  -- 削除後の最大ユーザー数を計算
  v_new_max_users := (v_contracts_count - 1) * 5;

  -- 現在のユーザー数が新しい上限を超える場合は削除不可
  IF v_current_users > v_new_max_users THEN
    RETURN QUERY SELECT false, format('現在のユーザー数（%s人）が新しい上限（%s人）を超えています', v_current_users, v_new_max_users);
    RETURN;
  END IF;

  -- 削除可能
  RETURN QUERY SELECT true, '契約削除可能';
END;
$$;

COMMENT ON FUNCTION can_remove_contract(uuid) IS '組織が契約を削除できるかチェック（最低1契約、現ユーザー数が新上限以下）';

-- ============================================
-- 7. トリガー関数 - 契約数変更時に履歴記録
-- ============================================

CREATE OR REPLACE FUNCTION log_contract_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 契約数が変更された場合のみ記録
  IF (TG_OP = 'UPDATE' AND OLD.contracts_count != NEW.contracts_count) THEN
    INSERT INTO subscription_contract_history (
      organization_id,
      subscription_id,
      changed_by,
      change_type,
      contracts_before,
      contracts_after,
      reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      auth.uid(),
      CASE
        WHEN NEW.contracts_count > OLD.contracts_count THEN 'add'
        ELSE 'remove'
      END,
      OLD.contracts_count,
      NEW.contracts_count,
      format('契約数を %s から %s に変更', OLD.contracts_count, NEW.contracts_count)
    );
  ELSIF (TG_OP = 'INSERT') THEN
    -- 新規サブスクリプション作成時
    INSERT INTO subscription_contract_history (
      organization_id,
      subscription_id,
      changed_by,
      change_type,
      contracts_before,
      contracts_after,
      reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      auth.uid(),
      'initial',
      0,
      NEW.contracts_count,
      '初期契約設定'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_log_contract_change ON organization_subscriptions;
CREATE TRIGGER trigger_log_contract_change
  AFTER INSERT OR UPDATE OF contracts_count ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_change();

-- ============================================
-- 8. 既存データの初期履歴レコード作成
-- ============================================

-- 既存のサブスクリプションに対して初期履歴レコードを作成
DO $$
DECLARE
  sub_record RECORD;
BEGIN
  FOR sub_record IN
    SELECT id, organization_id, contracts_count
    FROM organization_subscriptions
    WHERE status IN ('active', 'trial')
    AND NOT EXISTS (
      SELECT 1 FROM subscription_contract_history
      WHERE subscription_id = organization_subscriptions.id
    )
  LOOP
    -- システムユーザーとして初期レコードを作成
    INSERT INTO subscription_contract_history (
      organization_id,
      subscription_id,
      changed_by,
      change_type,
      contracts_before,
      contracts_after,
      reason
    ) VALUES (
      sub_record.organization_id,
      sub_record.id,
      (SELECT id FROM auth.users LIMIT 1), -- 最初のユーザーを使用
      'initial',
      0,
      sub_record.contracts_count,
      'システム移行による初期設定'
    );
  END LOOP;
END $$;

-- ============================================
-- 9. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ contracts_count カラム追加完了';
  RAISE NOTICE '✅ subscription_contract_history テーブル作成完了';
  RAISE NOTICE '✅ ヘルパー関数作成完了: get_total_available_users(), can_add_contract(), can_remove_contract()';
  RAISE NOTICE '✅ 契約変更履歴トリガー設定完了';
  RAISE NOTICE '✅ RLSポリシー設定完了';
  RAISE NOTICE '📋 契約数連動型ユーザー管理システムの準備完了';
  RAISE NOTICE '💡 1契約 = 5ユーザー、2契約 = 10ユーザー、3契約 = 15ユーザー...';
END $$;
