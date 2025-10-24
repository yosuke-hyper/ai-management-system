# 本番環境セットアップ SQL

Supabase SQL Editorで以下のSQLを順番に実行してください。

---

## 1. プロファイル自動作成トリガー

**実行場所**: Supabase Dashboard → SQL Editor → New Query

```sql
-- プロファイル自動作成関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::text,
      'staff'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 既存トリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 新規ユーザー作成時のトリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**確認**:
```sql
-- トリガーが作成されたか確認
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## 2. RLS ポリシー完全実装

```sql
-- admin判定ヘルパー関数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================
-- profiles テーブル
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
FOR SELECT
USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
FOR UPDATE
USING (id = auth.uid() OR is_admin())
WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- stores テーブル
-- ============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select" ON stores;
CREATE POLICY "stores_select" ON stores
FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = stores.id AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "stores_modify" ON stores;
CREATE POLICY "stores_modify" ON stores
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================
-- store_assignments テーブル
-- ============================================
ALTER TABLE store_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_select" ON store_assignments;
CREATE POLICY "sa_select" ON store_assignments
FOR SELECT
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "sa_admin" ON store_assignments;
CREATE POLICY "sa_admin" ON store_assignments
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================
-- vendors テーブル
-- ============================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_select" ON vendors;
CREATE POLICY "vendors_select" ON vendors
FOR SELECT
USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "vendors_admin" ON vendors;
CREATE POLICY "vendors_admin" ON vendors
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================
-- store_vendor_assignments テーブル
-- ============================================
ALTER TABLE store_vendor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sva_select" ON store_vendor_assignments;
CREATE POLICY "sva_select" ON store_vendor_assignments
FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = store_vendor_assignments.store_id
      AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "sva_admin" ON store_vendor_assignments;
CREATE POLICY "sva_admin" ON store_vendor_assignments
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================
-- daily_reports テーブル
-- ============================================
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dr_select" ON daily_reports;
CREATE POLICY "dr_select" ON daily_reports
FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = daily_reports.store_id
      AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "dr_insert" ON daily_reports;
CREATE POLICY "dr_insert" ON daily_reports
FOR INSERT
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = daily_reports.store_id
      AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "dr_update" ON daily_reports;
CREATE POLICY "dr_update" ON daily_reports
FOR UPDATE
USING (
  is_admin() OR daily_reports.user_id = auth.uid()
)
WITH CHECK (
  is_admin() OR daily_reports.user_id = auth.uid()
);

DROP POLICY IF EXISTS "dr_delete" ON daily_reports;
CREATE POLICY "dr_delete" ON daily_reports
FOR DELETE
USING (is_admin());

-- ============================================
-- monthly_expenses テーブル
-- ============================================
ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "me_select" ON monthly_expenses;
CREATE POLICY "me_select" ON monthly_expenses
FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = monthly_expenses.store_id
      AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "me_modify" ON monthly_expenses;
CREATE POLICY "me_modify" ON monthly_expenses
FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = monthly_expenses.store_id
      AND sa.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('manager', 'admin')
      )
  )
)
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = monthly_expenses.store_id
      AND sa.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('manager', 'admin')
      )
  )
);
```

**確認**:
```sql
-- RLS状態確認
SELECT * FROM rls_status WHERE rls_enabled = false;

-- 無効なテーブルがある場合は有効化
-- ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

---

## 3. テストデータ削除（本番DB実行前に必ずバックアップ！）

```sql
-- ⚠️ 警告: 本番実行前に必ずバックアップを取得してください

BEGIN;

-- デモユーザー削除
DELETE FROM auth.users WHERE email IN (
  'admin@example.com',
  'admin@demo.com',
  'manager@demo.com',
  'staff@demo.com',
  'test@example.com'
);

-- 古いテストデータ削除（必要に応じて）
-- DELETE FROM daily_reports WHERE date < '2025-01-01';

-- 確認
SELECT email FROM auth.users;
SELECT COUNT(*) FROM daily_reports;

-- 問題なければコミット、問題があればロールバック
COMMIT;
-- ROLLBACK;
```

---

## 4. 初期管理者アカウント作成

**方法A: Supabaseダッシュボードで作成（推奨）**

1. `Authentication` → `Users` → `Add user`
2. Email: 実際の管理者メールアドレス
3. Password: 強力なパスワード
4. Auto Confirm User: ON

作成後、SQLで権限を付与:

```sql
-- 管理者権限を付与
UPDATE profiles
SET role = 'admin', name = '管理者名'
WHERE email = 'admin@your-domain.com';
```

**方法B: SQLで直接作成**

```sql
-- パスワードをハッシュ化（bcryptハッシュ値を生成）
-- 注意: 実際のハッシュ値は別途生成ツールで作成してください

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@your-domain.com',
  -- ⚠️ ここに bcrypt ハッシュ化したパスワードを入れる
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  NOW(),
  NOW(),
  NOW()
);

-- プロファイルは自動作成されますが、手動で確認・更新
UPDATE profiles
SET role = 'admin', name = '本部統括責任者'
WHERE email = 'admin@your-domain.com';
```

---

## 5. 本番用店舗マスター登録

```sql
-- 既存のテスト店舗を削除（必要に応じて）
-- DELETE FROM stores WHERE id IN ('store-toyosu', 'store-ariake', 'store-honten', 'store-afro');

-- 実際の店舗を登録
INSERT INTO stores (id, name, address, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), '居酒屋いっき 豊洲店', '東京都江東区豊洲○-○-○', true, NOW(), NOW()),
  (gen_random_uuid(), '居酒屋いっき 有明店', '東京都江東区有明○-○-○', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 登録確認
SELECT * FROM stores WHERE is_active = true;
```

---

## 6. 店舗割当の設定

```sql
-- 管理者に全店舗を割当
INSERT INTO store_assignments (user_id, store_id, created_at)
SELECT
  p.id,
  s.id,
  NOW()
FROM profiles p
CROSS JOIN stores s
WHERE p.role = 'admin' AND s.is_active = true
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 店長ユーザーに特定店舗を割当（例）
INSERT INTO store_assignments (user_id, store_id, created_at)
SELECT
  (SELECT id FROM profiles WHERE email = 'manager@your-domain.com'),
  (SELECT id FROM stores WHERE name LIKE '%豊洲店%'),
  NOW()
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 割当確認
SELECT
  p.name AS user_name,
  p.email,
  p.role,
  s.name AS store_name
FROM store_assignments sa
JOIN profiles p ON p.id = sa.user_id
JOIN stores s ON s.id = sa.store_id
ORDER BY p.name, s.name;
```

---

## 7. 業者マスターと店舗割当

```sql
-- 業者登録（例）
INSERT INTO vendors (id, name, category, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), '豊洲市場青果卸', 'vegetable_meat', true, NOW(), NOW()),
  (gen_random_uuid(), '築地海産物', 'seafood', true, NOW(), NOW()),
  (gen_random_uuid(), '酒類卸売', 'alcohol', true, NOW(), NOW()),
  (gen_random_uuid(), 'イワタニ', 'gas', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 各店舗に業者を割当（表示順も設定）
INSERT INTO store_vendor_assignments (store_id, vendor_id, display_order, created_at)
SELECT
  s.id,
  v.id,
  ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY v.name) - 1
FROM stores s
CROSS JOIN vendors v
WHERE s.is_active = true AND v.is_active = true
ON CONFLICT (store_id, vendor_id) DO NOTHING;

-- 確認
SELECT
  s.name AS store_name,
  v.name AS vendor_name,
  v.category,
  sva.display_order
FROM store_vendor_assignments sva
JOIN stores s ON s.id = sva.store_id
JOIN vendors v ON v.id = sva.vendor_id
ORDER BY s.name, sva.display_order;
```

---

## 8. 最終確認チェックリスト

```sql
-- 1. RLS有効化確認
SELECT * FROM rls_status WHERE rls_enabled = false;
-- 期待: 0行（全テーブルRLS有効）

-- 2. ユーザー確認
SELECT email, (SELECT role FROM profiles WHERE profiles.id = auth.users.id) AS role
FROM auth.users;

-- 3. 店舗確認
SELECT * FROM stores WHERE is_active = true;

-- 4. 店舗割当確認
SELECT
  p.email,
  p.role,
  COUNT(sa.store_id) AS store_count
FROM profiles p
LEFT JOIN store_assignments sa ON sa.user_id = p.id
GROUP BY p.id, p.email, p.role;

-- 5. 業者割当確認
SELECT
  s.name,
  COUNT(sva.vendor_id) AS vendor_count
FROM stores s
LEFT JOIN store_vendor_assignments sva ON sva.store_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.name;

-- 6. トリガー確認
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## トラブルシューティング

### エラー: "new row violates row-level security policy"

**原因**: RLSポリシーが厳しすぎる、またはユーザーに権限がない

**解決策**:
```sql
-- 該当テーブルのポリシーを確認
SELECT * FROM rls_policies WHERE tablename = '<table_name>';

-- 必要に応じてポリシーを修正
```

### プロファイルが作成されない

**原因**: トリガーが動作していない

**解決策**:
```sql
-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 既存ユーザーのプロファイルを手動作成
INSERT INTO profiles (id, email, name, role)
SELECT
  id,
  email,
  split_part(email, '@', 1),
  'staff'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

---

## 実行順序まとめ

1. ✅ プロファイル自動作成トリガー
2. ✅ RLS ポリシー完全実装
3. ✅ テストデータ削除
4. ✅ 初期管理者アカウント作成
5. ✅ 本番用店舗マスター登録
6. ✅ 店舗割当の設定
7. ✅ 業者マスターと店舗割当
8. ✅ 最終確認チェックリスト

すべて完了したら、本番デプロイの準備が完了です。
