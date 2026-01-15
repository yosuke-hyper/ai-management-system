# 監視・アラート運用ガイド

**作成日**: 2025年12月29日
**バージョン**: 1.0
**対象システム**: FoodValue AI Management System

---

## 1. 監視システム概要

### 1.1 監視コンポーネント

| コンポーネント | 説明 | ファイル |
|--------------|------|---------|
| Error Logger | フロントエンドエラー収集・DB記録 | `src/services/errorLogger.ts` |
| System Health | システムヘルスメトリクス | `src/services/systemHealthService.ts` |
| Notification | アプリ内通知 | `src/services/notificationService.ts` |
| Health Check | Edge Function監視 | `supabase/functions/health-check/` |
| Error Log API | エラー記録API | `supabase/functions/log-error/` |

### 1.2 データ収集先

| テーブル | 用途 |
|---------|-----|
| `error_logs` | エラーログ（severity, message, context） |
| `system_health_metrics` | システムヘルスメトリクス |
| `audit_logs` | 監査ログ（ユーザーアクション） |
| `api_performance_logs` | APIパフォーマンス記録 |

---

## 2. エラー分類（P1/P2/P3）

### P1 - Critical（即時対応必須）

**定義**: サービス全体または主要機能が停止している状態

**対象エラー**:
- データベース接続不可
- 認証システムの完全停止
- 全ユーザーに影響するクリティカルエラー
- データ損失のリスクがある状態
- セキュリティインシデント

**判定基準**:
```javascript
severity === 'critical' ||
error_type === 'DATABASE_ERROR' ||
error_type === 'AUTH_ERROR' && affected_users > 10
```

**対応目標**:
- 初動開始: 15分以内
- 原因特定: 1時間以内
- 復旧完了: 4時間以内

---

### P2 - High（営業時間内に対応）

**定義**: 一部機能が利用できない、または著しく性能低下している状態

**対象エラー**:
- AI機能の停止
- レポート生成の失敗
- 特定店舗のデータアクセス不可
- Edge Functionsの部分的障害
- P95レスポンスタイム > 2000ms

**判定基準**:
```javascript
severity === 'error' ||
error_rate > 5% ||
p95_response_time > 2000
```

**対応目標**:
- 初動開始: 2時間以内
- 原因特定: 4時間以内
- 復旧完了: 24時間以内

---

### P3 - Medium/Low（計画的に対応）

**定義**: 軽微な問題、または回避策がある状態

**対象エラー**:
- UIの軽微なバグ
- 非必須機能の不具合
- パフォーマンスの軽微な低下
- 特定ブラウザでの表示崩れ

**判定基準**:
```javascript
severity === 'warning' || severity === 'info'
```

**対応目標**:
- 初動開始: 1営業日以内
- 修正完了: 次回リリース

---

## 3. 初動対応手順

### 3.1 P1インシデント初動フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    P1インシデント検知                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 状況確認（5分以内）                                  │
│ - エラーログ確認: /dashboard/admin → エラーログビューア       │
│ - システムヘルス確認: /dashboard/admin → システムヘルス       │
│ - 影響範囲の特定                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 初期対応（15分以内）                                 │
│ - Supabaseダッシュボードでサービス状態確認                    │
│ - 必要に応じてEdge Functions再デプロイ                        │
│ - 影響を受けるユーザーへの通知準備                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 原因調査（1時間以内）                                │
│ - Supabase Logsで詳細確認                                    │
│ - 直近のデプロイ・変更履歴確認                                │
│ - データベースの状態確認                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 復旧作業                                             │
│ - ロールバックまたは修正パッチ適用                            │
│ - 復旧確認テスト                                             │
│ - ユーザーへの復旧通知                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: 事後対応                                             │
│ - インシデントレポート作成                                    │
│ - 再発防止策の検討                                            │
│ - 監視強化の実施                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 確認手順詳細

#### エラーログ確認

```bash
# 直近のエラー確認（Supabase SQL Editor）
SELECT
  severity,
  error_type,
  message,
  context,
  created_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;

# クリティカルエラーのみ
SELECT * FROM error_logs
WHERE severity = 'critical'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

#### システムヘルス確認

```bash
# 最新のヘルスメトリクス
SELECT * FROM system_health_metrics
ORDER BY recorded_at DESC
LIMIT 1;

# 直近24時間のエラー推移
SELECT
  DATE_TRUNC('hour', recorded_at) as hour,
  AVG(errors_last_hour) as avg_errors,
  MAX(critical_errors_24h) as max_critical
FROM system_health_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;
```

#### Edge Functions確認

```bash
# Supabase Dashboard → Edge Functions → Logs
# または
curl -X GET "https://awsolfqlwxpuhavmqtjy.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## 4. 通知設定

### 4.1 通知先一覧

| 優先度 | 通知先 | 方法 | タイミング |
|-------|-------|------|-----------|
| P1 | 運用担当者 | アプリ内通知 + メール | 即時 |
| P2 | 運用担当者 | アプリ内通知 | 2時間以内 |
| P3 | 運用担当者 | アプリ内通知 | 1営業日以内 |

### 4.2 通知テンプレート

**P1通知例**:
```
[CRITICAL] サービス障害発生

発生日時: 2025-12-29 14:30:00 JST
影響範囲: 全ユーザー
エラー内容: データベース接続エラー
ステータス: 調査中

対応状況は随時更新します。
```

### 4.3 外部通知連携（将来実装）

Slackへの通知連携は以下で実装可能：

```typescript
// Edge Function: notify-slack
async function notifySlack(severity: string, message: string) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `[${severity}] ${message}`,
      attachments: [{ color: severity === 'critical' ? 'danger' : 'warning' }]
    })
  });
}
```

---

## 5. 監視ダッシュボード

### 5.1 アクセス方法

1. 管理者としてログイン
2. 左メニュー → 管理設定
3. システムヘルス タブを選択

### 5.2 主要メトリクス

| メトリクス | 正常値 | 警告値 | 危険値 |
|-----------|-------|-------|-------|
| エラー率 | < 0.1% | 0.1-1% | > 1% |
| P95レスポンス | < 500ms | 500-1000ms | > 1000ms |
| DB接続数 | < 50 | 50-80 | > 80 |
| 24hエラー数 | < 10 | 10-50 | > 50 |

### 5.3 自動監視設定

```sql
-- 5分ごとのヘルスチェック（pg_cron）
SELECT cron.schedule(
  'health-check-5min',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://awsolfqlwxpuhavmqtjy.supabase.co/functions/v1/health-check',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )$$
);
```

---

## 6. エスカレーション基準

### 6.1 エスカレーションマトリクス

| 経過時間 | P1 | P2 | P3 |
|---------|-----|-----|-----|
| 15分 | 運用担当者 | - | - |
| 1時間 | 開発責任者 | 運用担当者 | - |
| 4時間 | 経営層 | 開発責任者 | 運用担当者 |
| 24時間 | 外部ベンダー | 経営層 | 開発責任者 |

### 6.2 連絡先

| 役割 | 連絡方法 | 対応時間 |
|------|---------|---------|
| 運用担当者 | メール/チャット | 平日 9:00-18:00 |
| 開発責任者 | 緊急電話 | 24/365（P1のみ） |

---

## 7. チェックリスト

### 7.1 日次チェック

- [ ] システムヘルスダッシュボード確認
- [ ] 直近24時間のエラーログ確認
- [ ] P95レスポンスタイムの確認
- [ ] Edge Functions稼働状況確認

### 7.2 週次チェック

- [ ] エラートレンド分析
- [ ] パフォーマンストレンド分析
- [ ] ストレージ使用量確認
- [ ] バックアップ状態確認

### 7.3 月次チェック

- [ ] インシデントレポートまとめ
- [ ] SLA達成状況確認
- [ ] 監視設定の見直し
- [ ] セキュリティログ監査

---

## 8. 付録

### 8.1 よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|--------|
| `PGRST3XX` | PostgreST APIエラー | RLSポリシー確認 |
| `AUTH_ERROR` | 認証エラー | JWTトークン確認 |
| `FUNCTION_ERROR` | Edge Function障害 | 再デプロイ |
| `TIMEOUT` | タイムアウト | クエリ最適化 |

### 8.2 有用なクエリ集

```sql
-- エラー頻度TOP10
SELECT error_type, COUNT(*) as count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY count DESC
LIMIT 10;

-- 時間帯別エラー分布
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as error_count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;

-- 影響ユーザー数
SELECT COUNT(DISTINCT user_id) as affected_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
AND severity IN ('critical', 'error');
```

---

**ドキュメント更新履歴**:
- 2025-12-29: 初版作成
