# Google Sheets API設定ガイド

## 📋 手順1: Google Cloud Consoleでプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存プロジェクトを選択）
3. プロジェクト名を入力（例：「restaurant-report-system」）

## 🔑 手順2: Google Sheets APIを有効化

1. **APIとサービス** → **ライブラリ** をクリック
2. 「Google Sheets API」を検索
3. **Google Sheets API** をクリックして **有効にする**

## 🗝️ 手順3: APIキーを作成

1. **APIとサービス** → **認証情報** をクリック
2. **認証情報を作成** → **APIキー** を選択
3. APIキーが作成されたら **コピー** してください

## 🛡️ 手順4: APIキーの制限設定（推奨）

1. 作成したAPIキーの **編集** をクリック
2. **APIの制限** セクションで：
   - 「キーを制限する」を選択
   - **Google Sheets API** にチェック
3. **Webサイトの制限** セクションで：
   - 「HTTPリファラー（ウェブサイト）」を選択
   - `http://localhost:*` を追加
   - 本番環境のドメインも追加
4. **保存** をクリック

## 📊 手順5: Google Sheetsの共有設定

1. [このGoogle Sheetsテンプレート](https://docs.google.com/spreadsheets/d/1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco/edit) を開く
2. **共有** ボタンをクリック
3. **制限付きアクセス** を **「リンクを知っている全員」** に変更
4. 権限を **「閲覧者」** または **「編集者」** に設定
5. **完了** をクリック

## ⚙️ 手順6: 環境変数の設定

`.env` ファイルに以下を設定：

```env
# 重要: プレースホルダーを削除して、実際のAPIキーを貼り付けてください
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD... (あなたの実際のAPIキー)
VITE_GOOGLE_SHEET_ID=1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco
```

**重要な注意点:**
- `your_google_sheets_api_key_here` のようなプレースホルダーは削除してください
- APIキーは `AIza` で始まる39文字の文字列です
- コピー時に余分な空白や改行が含まれないよう注意してください
## 🧪 手順7: 接続テスト

1. アプリケーションを再起動
2. ダッシュボードの「Google Sheets連携」カードで **接続テスト** をクリック
3. 「✅ シートへの接続に成功しました」と表示されれば完了！

## ❌ よくあるエラーと対処法

### 401 Unauthorized
- APIキーが間違っているか、権限が不足
- APIキーの制限設定を確認

### 403 Forbidden
- Sheetsの共有設定が「制限付きアクセス」になっている
- 「リンクを知っている全員が閲覧可能」に変更

### 404 Not Found
- シートIDが間違っている
- シートが削除されている

### 400 Bad Request
- APIキーの形式が正しくない
- Google Sheets APIが有効になっていない

## 🔄 データ同期の仕組み

- **日次報告作成時**: 自動的にGoogle Sheetsに保存
- **手動同期**: ダッシュボードから一括同期可能
- **データ形式**: 日付、店舗名、売上、経費項目等を自動計算

## 📞 サポート

設定でお困りの場合は、エラーメッセージと共にお知らせください。

---

設定完了後は、日次報告がリアルタイムでGoogle Sheetsに反映されます！📊