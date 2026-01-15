# バックアップ・復旧手順ガイド

**作成日**: 2025年12月29日
**バージョン**: 1.0
**対象システム**: FoodValue AI Management System (Supabase)

---

## 1. バックアップ概要

### 1.1 Supabase自動バックアップ

Supabaseでは、プランに応じて自動バックアップが提供されます。

| プラン | バックアップ頻度 | 保持期間 | PITR |
|-------|---------------|---------|------|
| Free | 日次 | 7日間 | なし |
| Pro | 日次 | 7日間 | あり |
| Team | 日次 | 14日間 | あり |
| Enterprise | カスタム | カスタム | あり |

**PITR (Point-in-Time Recovery)**: 任意の時点への復旧が可能

### 1.2 バックアップ対象

| 対象 | 自動バックアップ | 備考 |
|------|----------------|------|
| PostgreSQLデータ | Yes | 全テーブル |
| Storage (バケット) | Yes | 画像・ファイル |
| Edge Functions | No | GitHubで管理 |
| 環境変数 | No | .envで管理 |
| RLSポリシー | Yes | スキーマに含む |

---

## 2. バックアップ確認手順

### 2.1 自動バックアップの確認

1. Supabase Dashboard にログイン
2. プロジェクト選択
3. Settings → Database → Backups
4. バックアップ一覧と状態を確認

### 2.2 バックアップ状態の確認SQL

```sql
-- 最新のバックアップ状態（pg_stat_archiver）
SELECT
  archived_count,
  last_archived_wal,
  last_archived_time,
  last_failed_wal,
  last_failed_time
FROM pg_stat_archiver;

-- データベースサイズ確認
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
WHERE datname = current_database();
```

---

## 3. 復旧手順

### 3.1 日次バックアップからの復旧

**Step 1: バックアップの選択**
1. Supabase Dashboard → Settings → Database → Backups
2. 復旧したい日付のバックアップを選択
3. "Restore" ボタンをクリック

**Step 2: 復旧の実行**
1. 復旧先の確認（同じプロジェクトに上書き）
2. 確認ダイアログで "Restore" を選択
3. 復旧完了まで待機（データ量により数分〜数十分）

**Step 3: 復旧後の確認**
```sql
-- データ件数確認
SELECT 'daily_reports' as table_name, COUNT(*) as count FROM daily_reports
UNION ALL
SELECT 'stores', COUNT(*) FROM stores
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;

-- 最新データの日時確認
SELECT MAX(created_at) as latest_record FROM daily_reports;
```

### 3.2 PITR (Point-in-Time Recovery)

**前提条件**: Pro プラン以上

**Step 1: 復旧時点の特定**
```sql
-- 問題発生前の最後の正常なトランザクション時刻を特定
SELECT
  created_at,
  action,
  resource_type,
  status
FROM audit_logs
WHERE created_at > '2025-12-29 00:00:00'
ORDER BY created_at DESC
LIMIT 100;
```

**Step 2: PITRの実行**
1. Supabase Dashboard → Settings → Database → Backups
2. "Point-in-Time Recovery" セクション
3. 復旧したい日時を指定（UTC）
4. "Restore" を実行

### 3.3 特定テーブルのデータ復旧

**シナリオ**: 特定テーブルのデータのみ復旧したい場合

**Step 1: バックアップからのエクスポート**
```sql
-- pg_dumpを使用（Supabase CLIまたはpsql）
pg_dump --table=daily_reports --data-only \
  "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  > daily_reports_backup.sql
```

**Step 2: 復旧用テンポラリテーブル作成**
```sql
-- 既存データを保護するため、テンポラリテーブルに復旧
CREATE TABLE daily_reports_recovered AS
SELECT * FROM daily_reports WHERE 1=0;

-- バックアップデータをインポート
\copy daily_reports_recovered FROM 'daily_reports_backup.csv' CSV HEADER;
```

**Step 3: データのマージ**
```sql
-- 差分確認
SELECT
  r.id,
  r.date,
  r.sales as recovered_sales,
  d.sales as current_sales
FROM daily_reports_recovered r
LEFT JOIN daily_reports d ON d.id = r.id
WHERE r.sales != d.sales OR d.id IS NULL;

-- 選択的に復旧
INSERT INTO daily_reports
SELECT * FROM daily_reports_recovered
WHERE id NOT IN (SELECT id FROM daily_reports)
ON CONFLICT (id) DO NOTHING;
```

---

## 4. 誤操作からの復旧

### 4.1 誤って削除されたデータの復旧

**シナリオ**: 特定日付のレポートを誤って削除

**Step 1: 削除されたデータの特定**
```sql
-- 監査ログから削除操作を確認
SELECT
  action,
  resource_type,
  resource_id,
  details,
  created_at
FROM audit_logs
WHERE action = 'delete'
AND resource_type = 'daily_reports'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Step 2: 復旧オプションの選択**

| オプション | 方法 | 所要時間 |
|-----------|------|---------|
| PITR | 削除前の時点に復旧 | 10-30分 |
| バックアップ | 日次バックアップから復旧 | 10-30分 |
| 監査ログ | detailsから手動復旧 | 数分（件数による） |

**Step 3: 監査ログからの手動復旧（少量の場合）**
```sql
-- 監査ログのdetailsからデータを再構築
-- （監査ログにold_dataが含まれている場合）
INSERT INTO daily_reports (id, store_id, date, sales, ...)
SELECT
  (details->>'old_data'->>'id')::uuid,
  (details->>'old_data'->>'store_id')::uuid,
  (details->>'old_data'->>'date')::date,
  (details->>'old_data'->>'sales')::integer,
  ...
FROM audit_logs
WHERE action = 'delete'
AND resource_type = 'daily_reports'
AND resource_id = '<削除されたID>';
```

### 4.2 誤ったCSVインポートの復旧

**シナリオ**: 間違ったデータをインポートしてしまった

**Step 1: インポート日時の特定**
```sql
-- 直近のインポート履歴確認
SELECT
  created_at,
  store_id,
  COUNT(*) as record_count
FROM daily_reports
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY created_at, store_id
ORDER BY created_at DESC;
```

**Step 2: 問題データの特定と削除**
```sql
-- インポート時刻と店舗で特定して削除
BEGIN;

-- 削除前にバックアップ
CREATE TABLE daily_reports_before_rollback AS
SELECT * FROM daily_reports
WHERE store_id = '<対象店舗ID>'
AND created_at > '<インポート開始時刻>';

-- 問題データの削除
DELETE FROM daily_reports
WHERE store_id = '<対象店舗ID>'
AND created_at > '<インポート開始時刻>';

COMMIT;
```

**Step 3: 正しいデータの再インポート**
- CSVファイルを修正
- 再度インポート実行

---

## 5. 日次レポート復旧の特殊手順

### 5.1 日付範囲指定の一括削除

```sql
-- 特定日付範囲のレポートを削除（復旧用）
BEGIN;

-- バックアップ作成
CREATE TABLE daily_reports_backup_YYYYMMDD AS
SELECT * FROM daily_reports
WHERE date BETWEEN '2025-12-01' AND '2025-12-31'
AND store_id = '<対象店舗ID>';

-- 削除実行
DELETE FROM daily_reports
WHERE date BETWEEN '2025-12-01' AND '2025-12-31'
AND store_id = '<対象店舗ID>';

-- 件数確認
SELECT COUNT(*) FROM daily_reports_backup_YYYYMMDD;

COMMIT;
-- または ROLLBACK; で取り消し
```

### 5.2 バックアップテーブルからの復旧

```sql
-- バックアップテーブルから復旧
INSERT INTO daily_reports
SELECT * FROM daily_reports_backup_YYYYMMDD
ON CONFLICT (store_id, date, operation_type)
DO UPDATE SET
  sales = EXCLUDED.sales,
  purchase = EXCLUDED.purchase,
  labor_cost = EXCLUDED.labor_cost,
  updated_at = NOW();
```

---

## 6. 復旧テスト手順

### 6.1 月次復旧テスト

**目的**: バックアップからの復旧が正常に機能することを確認

**手順**:

1. **テスト環境の準備**
   - 本番とは別のSupabaseプロジェクトを使用
   - または、開発環境で実施

2. **テストデータの作成**
   ```sql
   -- テスト用レコードを作成
   INSERT INTO daily_reports (store_id, organization_id, user_id, date, operation_type, sales, purchase, customers)
   VALUES ('<test_store_id>', '<test_org_id>', '<test_user_id>', CURRENT_DATE, 'lunch', 100000, 30000, 50);
   ```

3. **削除の実行**
   ```sql
   DELETE FROM daily_reports WHERE sales = 100000 AND date = CURRENT_DATE;
   ```

4. **復旧の実行**
   - PITRまたは日次バックアップから復旧

5. **復旧確認**
   ```sql
   SELECT * FROM daily_reports WHERE date = CURRENT_DATE AND sales = 100000;
   ```

6. **結果の記録**
   - 復旧所要時間
   - データ整合性
   - 問題点の有無

---

## 7. 重要な注意事項

### 7.1 データ安全のベストプラクティス

1. **削除前に必ずバックアップ**
   ```sql
   CREATE TABLE backup_before_delete AS SELECT * FROM target_table WHERE <条件>;
   ```

2. **トランザクションを使用**
   ```sql
   BEGIN;
   -- 操作
   -- 確認
   COMMIT; -- または ROLLBACK;
   ```

3. **監査ログの確認**
   - 重要な操作前後で監査ログを確認

4. **テスト環境での事前確認**
   - 大規模な変更は必ずテスト環境で実施

### 7.2 復旧時の制限事項

| 制限事項 | 説明 |
|---------|------|
| PITR対象期間 | プランにより7-14日間 |
| 復旧中のサービス | 一時的に利用不可 |
| RLSポリシー | スキーマと共に復旧 |
| Edge Functions | 別途再デプロイ必要 |
| 環境変数 | 手動で再設定必要 |

---

## 8. 連絡先・エスカレーション

| 状況 | 連絡先 | 対応 |
|------|-------|------|
| 通常の復旧 | 運用担当者 | 本ガイドに従い実施 |
| 大規模障害 | Supabaseサポート | support.supabase.com |
| データ損失 | 開発責任者 | 緊急対応会議 |

---

## 9. チェックリスト

### 復旧実施前チェック

- [ ] 影響範囲の特定完了
- [ ] 復旧方法の選択完了
- [ ] 関係者への連絡完了
- [ ] バックアップの存在確認
- [ ] テスト環境での事前確認（可能な場合）

### 復旧実施後チェック

- [ ] データ件数の確認
- [ ] データ整合性の確認
- [ ] アプリケーションの動作確認
- [ ] ユーザーへの通知
- [ ] インシデントレポートの作成

---

**ドキュメント更新履歴**:
- 2025-12-29: 初版作成
