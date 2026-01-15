# 🔥 負荷テストガイド

## 📋 目次

1. [セットアップ](#セットアップ)
2. [テスト実行](#テスト実行)
3. [結果の分析](#結果の分析)
4. [トラブルシューティング](#トラブルシューティング)

---

## 🛠️ セットアップ

### 1. k6のインストール

#### macOS
```bash
brew install k6
```

#### Windows (Chocolatey)
```bash
choco install k6
```

#### Linux
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 2. 環境変数設定

`.env.loadtest`ファイルを作成：

```bash
BASE_URL=https://your-app.netlify.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. テストユーザー作成

本番環境でテストする場合は、専用のテストユーザーを作成してください：

```sql
-- Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password)
VALUES ('loadtest@example.com', crypt('LoadTest123!', gen_salt('bf')));
```

---

## 🚀 テスト実行

### 基本的な負荷テスト（100同時ユーザー）

```bash
# 環境変数を読み込んで実行
export $(cat .env.loadtest | xargs)

k6 run \
  --env BASE_URL=$BASE_URL \
  --env SUPABASE_URL=$SUPABASE_URL \
  --env SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  basic-load-test.js
```

**期待される結果:**
```
✓ login successful
✓ dashboard loaded
✓ dashboard response time OK
✓ reports loaded
✓ stores loaded
✓ monthly data loaded

checks.........................: 99.99% ✓ 59994    ✗ 6
data_received..................: 150 MB 2.5 MB/s
data_sent......................: 45 MB  750 kB/s
http_req_duration..............: avg=345ms  min=12ms  med=289ms  max=1.8s  p(95)=890ms p(99)=1.2s
http_req_failed................: 0.01%  ✓ 6        ✗ 59994
http_reqs......................: 60000  1000/s
iteration_duration.............: avg=8.5s   min=7.2s  med=8.3s   max=12s
iterations.....................: 10000  166.67/s
vus............................: 100    min=0      max=100
```

### ストレステスト（1000同時ユーザー）

```bash
k6 run \
  --env BASE_URL=$BASE_URL \
  stress-test.js
```

**目的:** システムの限界を見つける

**期待される挙動:**
- CPU使用率が上昇
- レスポンスタイムが増加
- エラー率が上昇（5%未満）

### スパイクテスト（急激な負荷増加）

```bash
k6 run \
  --env BASE_URL=$BASE_URL \
  spike-test.js
```

**目的:** 急激なトラフィック増加への対応確認

**重要指標:**
- 復旧時間
- エラー率
- オートスケーリングの動作

### 持久テスト（2時間）

```bash
k6 run \
  --env BASE_URL=$BASE_URL \
  --env SUPABASE_URL=$SUPABASE_URL \
  --env SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  endurance-test.js
```

**目的:** メモリリーク、パフォーマンス劣化の検出

**チェック項目:**
- メモリ使用量の推移
- レスポンスタイムの推移
- エラー率の推移

---

## 📊 結果の分析

### HTML レポート生成

```bash
k6 run --out json=results.json basic-load-test.js
k6 report results.json --out html
```

### Grafana で可視化

1. **InfluxDB + Grafana セットアップ:**

```bash
# Docker Compose
docker-compose up -d
```

`docker-compose.yml`:
```yaml
version: '3'
services:
  influxdb:
    image: influxdb:1.8
    ports:
      - "8086:8086"
    environment:
      - INFLUXDB_DB=k6

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
```

2. **k6 実行時に InfluxDB へ送信:**

```bash
k6 run --out influxdb=http://localhost:8086/k6 basic-load-test.js
```

3. **Grafana でダッシュボード作成:**
   - http://localhost:3000 にアクセス
   - InfluxDB データソース追加
   - k6 ダッシュボードをインポート

### 重要指標

#### 1. レスポンスタイム

```
✅ 良好: P95 < 2秒
⚠️ 注意: P95 2-5秒
❌ 問題: P95 > 5秒
```

#### 2. エラー率

```
✅ 良好: < 0.1%
⚠️ 注意: 0.1-1%
❌ 問題: > 1%
```

#### 3. スループット

```
✅ 良好: > 100 req/s
⚠️ 注意: 50-100 req/s
❌ 問題: < 50 req/s
```

#### 4. 同時接続数

```
目標: 100同時ユーザー
限界: 1000同時ユーザー（ストレステスト）
```

---

## 📈 パフォーマンスメトリクス

### フロントエンド

```javascript
// Lighthouse CI 統合
npm install -g @lhci/cli

lhci autorun --config=lighthouserc.json
```

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173"],
      "numberOfRuns": 5
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3500}],
        "speed-index": ["error", {"maxNumericValue": 3000}]
      }
    }
  }
}
```

### バックエンド（Supabase）

Supabase ダッシュボードで確認：
- Database → Performance
- API → Logs
- Database → Query Performance

---

## 🔧 トラブルシューティング

### 問題1: タイムアウトエラーが多発

**原因:**
- データベースクエリが遅い
- ネットワーク遅延
- サーバーのリソース不足

**解決策:**
```sql
-- インデックスを追加
CREATE INDEX idx_daily_reports_date ON daily_reports(date);
CREATE INDEX idx_daily_reports_store_id ON daily_reports(store_id);
CREATE INDEX idx_daily_reports_org_date ON daily_reports(organization_id, date);

-- クエリの最適化
EXPLAIN ANALYZE SELECT * FROM daily_reports WHERE date > '2025-01-01';
```

### 問題2: メモリリーク

**検出方法:**
```bash
# 持久テスト実行中にメモリ使用量をモニタリング
watch -n 1 'ps aux | grep node'
```

**解決策:**
- React コンポーネントのクリーンアップ
- useEffect の依存配列確認
- イベントリスナーの削除

### 問題3: CPU使用率が高い

**原因:**
- 重いグラフ描画
- 不要な再レンダリング
- 最適化されていないループ

**解決策:**
```javascript
// React.memo でコンポーネントをメモ化
export const Dashboard = React.memo(({ data }) => {
  // ...
});

// useMemo でデータをメモ化
const chartData = useMemo(() => {
  return processChartData(rawData);
}, [rawData]);

// useCallback で関数をメモ化
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### 問題4: データベース接続エラー

**原因:**
- 接続プールが枯渇
- Supabase の制限超過

**解決策:**
```javascript
// リトライロジックの実装
async function fetchWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

---

## 🎯 目標値とベンチマーク

### パフォーマンス目標

| 指標 | 目標 | 許容範囲 |
|------|------|----------|
| レスポンスタイム (P95) | < 2秒 | < 3秒 |
| エラー率 | < 0.1% | < 1% |
| スループット | > 100 req/s | > 50 req/s |
| 同時ユーザー | 100人 | 50人 |
| CPU使用率 | < 70% | < 85% |
| メモリ使用率 | < 80% | < 90% |

### ベンチマーク（参考値）

**小規模システム（10店舗）:**
```
同時ユーザー: 50
レスポンスタイム: 500ms (P95)
スループット: 50 req/s
```

**中規模システム（50店舗）:**
```
同時ユーザー: 200
レスポンスタイム: 1000ms (P95)
スループット: 150 req/s
```

**大規模システム（100店舗）:**
```
同時ユーザー: 500
レスポンスタイム: 1500ms (P95)
スループット: 300 req/s
```

---

## 📝 テストチェックリスト

### 実施前

```
□ テスト環境準備完了
□ テストユーザー作成
□ 環境変数設定
□ バックアップ取得
□ 関係者への通知
```

### 実施中

```
□ CPU使用率モニタリング
□ メモリ使用率モニタリング
□ ログ確認
□ エラー率確認
□ レスポンスタイム確認
```

### 実施後

```
□ 結果の記録
□ レポート作成
□ 改善点の洗い出し
□ 次回テスト計画
```

---

## 🚀 継続的パフォーマンステスト

### CI/CD 統合

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 1'  # 毎週月曜 2:00 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          k6 run --out json=results.json load-tests/basic-load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

---

## 📞 サポート

問題が発生した場合：

1. **ログ確認**
   ```bash
   # k6 の詳細ログ
   k6 run --verbose basic-load-test.js

   # Supabase ログ
   # Supabase Dashboard → Logs → API
   ```

2. **コミュニティ**
   - k6 Community Forum
   - Supabase Discord
   - Stack Overflow

3. **ドキュメント**
   - [k6 Documentation](https://k6.io/docs/)
   - [Supabase Performance](https://supabase.com/docs/guides/platform/performance)

---

## 🎉 まとめ

負荷テストは以下の目的で実施します：

1. ✅ システムの限界を把握
2. ✅ パフォーマンスのボトルネック発見
3. ✅ スケーリング戦略の検証
4. ✅ 本番環境での安定性確保

定期的に実施することで、品質の高いサービスを提供できます！
