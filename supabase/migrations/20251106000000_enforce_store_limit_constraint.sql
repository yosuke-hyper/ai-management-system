/*
  # 契約店舗数の上限制約を強制

  ## 変更内容

  ### トリガー関数 `check_store_limit_before_insert`
  - stores テーブルへの INSERT 時に実行
  - 組織の契約店舗数（contracted_stores）を取得
  - 現在の有効な店舗数をカウント
  - 契約店舗数を超える場合はエラーを発生させて登録を中断

  ## セキュリティ
  - データベースレベルで店舗数制限を強制
  - フロントエンドのバリデーションをバイパスされても防御
  - 契約店舗数の正確な管理を保証

  ## エラーメッセージ
  - ユーザーフレンドリーな日本語エラーメッセージ
  - 契約店舗数と現在の登録数を明示
*/

-- 店舗数制限チェック関数
CREATE OR REPLACE FUNCTION check_store_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_store_count INT;
  contracted_store_limit INT;
  org_id UUID;
BEGIN
  -- 新規作成時のみチェック（編集は対象外）
  IF TG_OP = 'INSERT' THEN
    org_id := NEW.organization_id;

    -- 現在の有効な店舗数を取得（is_active = true のみカウント）
    SELECT COUNT(*) INTO current_store_count
    FROM stores
    WHERE organization_id = org_id
      AND is_active = true;

    -- 契約店舗数を取得（有効なサブスクリプションから）
    SELECT COALESCE(os.contracted_stores, 1) INTO contracted_store_limit
    FROM organization_subscriptions os
    WHERE os.organization_id = org_id
      AND os.status IN ('active', 'trial')
    ORDER BY os.created_at DESC
    LIMIT 1;

    -- 契約店舗数が取得できない場合はデフォルトで1店舗
    IF contracted_store_limit IS NULL THEN
      contracted_store_limit := 1;
    END IF;

    -- 店舗数制限チェック
    IF current_store_count >= contracted_store_limit THEN
      RAISE EXCEPTION '契約店舗数の上限（%店舗）に達しています。現在の登録店舗数: %店舗。店舗を追加するには、サブスクリプション管理から契約店舗数を増やしてください。',
        contracted_store_limit,
        current_store_count
        USING HINT = 'サブスクリプション管理ページから契約店舗数を変更できます';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS enforce_store_limit ON stores;

-- トリガーを作成
CREATE TRIGGER enforce_store_limit
  BEFORE INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION check_store_limit_before_insert();

-- 関数とトリガーにコメントを追加
COMMENT ON FUNCTION check_store_limit_before_insert() IS '店舗登録時に契約店舗数の上限を強制するトリガー関数';
COMMENT ON TRIGGER enforce_store_limit ON stores IS '契約店舗数を超える店舗登録を防止';
