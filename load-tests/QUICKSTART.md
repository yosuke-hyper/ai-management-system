# 🚀 負荷テスト クイックスタート

## 5分で始める負荷テスト

### ステップ1: k6インストール（1分）

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo apt-get install k6
```

### ステップ2: 環境変数設定（1分）

`.env.loadtest` ファイルを作成：

```bash
BASE_URL=https://your-app.netlify.app
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### ステップ3: テスト実行（3分）

```bash
cd load-tests
./run-all-tests.sh
```

完了！

---

## 📊 結果の見方

### 成功例

```
✓ checks.........................: 99.99%
✓ http_req_duration..............: avg=345ms p(95)=890ms
✓ http_req_failed................: 0.01%
✓ http_reqs......................: 60000 (1000/s)
```

**解釈:**
- ✅ 99.99%のリクエストが成功
- ✅ 95%のレスポンスが890ms以内
- ✅ 失敗率0.01%
- ✅ 毎秒1000リクエスト処理

### 問題がある例

```
✗ checks.........................: 85.50%
✗ http_req_duration..............: avg=5.2s p(95)=12s
✗ http_req_failed................: 14.5%
✗ http_reqs......................: 12000 (200/s)
```

**解釈:**
- ❌ 14.5%のリクエストが失敗
- ❌ レスポンスが遅い（12秒）
- ❌ スループットが低い

**対策が必要！**

---

## 🔧 トラブルシューティング

### エラー: "k6: command not found"

**解決策:**
```bash
# k6がインストールされているか確認
which k6

# なければインストール
brew install k6  # macOS
```

### エラー: "Connection refused"

**解決策:**
1. BASE_URLが正しいか確認
2. アプリケーションが起動しているか確認
3. ファイアウォールの確認

### エラー: "401 Unauthorized"

**解決策:**
1. SUPABASE_ANON_KEY が正しいか確認
2. テストユーザーが作成されているか確認

---

## 📈 次のステップ

1. **詳細分析**
   ```bash
   k6 report results/basic-load-20251125_100000.json --out html
   ```

2. **Grafana可視化**
   ```bash
   docker-compose up -d
   # http://localhost:3000 にアクセス
   ```

3. **CI/CD統合**
   - GitHub Actionsで自動実行
   - 週次でパフォーマンス監視

---

## 💡 ヒント

- **本番環境でテストする場合は必ず事前通知**
- **ピーク時間を避ける**
- **バックアップを取得してから実行**
- **徐々に負荷を上げる（ステージを使う）**

---

## 📞 ヘルプ

詳細は `README.md` を参照してください！
