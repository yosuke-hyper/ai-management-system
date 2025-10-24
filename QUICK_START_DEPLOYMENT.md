# クイックスタート：本番環境デプロイ

このガイドでは、最短で本番環境にデプロイする手順を説明します。

## 📋 前提条件

- [ ] Node.js 18以上がインストール済み
- [ ] GitHubアカウント作成済み
- [ ] コードがGitHubにプッシュ済み

## 🚀 5ステップでデプロイ

### ステップ1: Supabaseプロジェクトの作成（5分）

1. https://supabase.com にアクセス
2. 「Start your project」→「New project」
3. 以下を入力:
   - Name: `ai-management-production`
   - Database Password: 自動生成されたものを使用（必ず保存）
   - Region: `Northeast Asia (Tokyo)`
   - Plan: `Free` を選択（まずは無料プランでOK）
4. 「Create new project」をクリック
5. プロジェクトが作成されるまで待機（2-3分）

### ステップ2: データベースのセットアップ（10分）

1. 左メニュー → **SQL Editor** をクリック
2. 「New query」をクリック
3. プロジェクトの `supabase/migrations/` フォルダ内のSQLファイルを、**ファイル名の日付順に**コピー&ペーストして実行
4. すべてのマイグレーションを実行（37個のファイル）

**重要**: 各ファイルを順番に実行してください。エラーが出た場合は、そのエラーメッセージを確認してください。

### ステップ3: APIキーの取得（3分）

#### Supabase
1. 左メニュー → **Settings** → **API**
2. 以下をコピーして保存:
   - **Project URL**: 後で `VITE_SUPABASE_URL` として使用
   - **anon public key**: 後で `VITE_SUPABASE_ANON_KEY` として使用

#### OpenAI
1. https://platform.openai.com にアクセス
2. 左メニュー → **API keys**
3. 「Create new secret key」をクリック
4. キーをコピーして保存（再表示できないため注意）
5. **重要**: Settings → Limitsで使用量制限を設定（推奨: $50/月）

### ステップ4: Vercelへのデプロイ（5分）

1. https://vercel.com にアクセスしてログイン
2. 「Add New」→「Project」をクリック
3. GitHubリポジトリをインポート
4. 「Configure Project」で以下を設定:

**Build & Development Settings**:
- Framework Preset: `Vite`
- Build Command: `npm run build` (デフォルト)
- Output Directory: `dist` (デフォルト)

**Environment Variables** - 以下を追加:

| Name | Value |
|------|-------|
| `VITE_DEMO_MODE` | `false` |
| `VITE_USE_SUPABASE` | `true` |
| `VITE_SUPABASE_URL` | ステップ3で取得したURL |
| `VITE_SUPABASE_ANON_KEY` | ステップ3で取得したAnon Key |
| `VITE_OPENAI_API_KEY` | ステップ3で取得したOpenAI Key |
| `NODE_ENV` | `production` |

5. すべて「Production」、「Preview」、「Development」にチェック
6. 「Deploy」をクリック
7. デプロイ完了まで待機（2-3分）

### ステップ5: 認証設定の更新（2分）

1. Vercelのデプロイが完了したら、URLをコピー（例: `https://your-app.vercel.app`）
2. Supabaseダッシュボードに戻る
3. 左メニュー → **Authentication** → **URL Configuration**
4. 以下を設定:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**` を追加
5. 「Save」をクリック

## ✅ 動作確認

デプロイしたURLにアクセスして、以下を確認:

1. [ ] ログイン画面が表示される
2. [ ] 新規ユーザー登録ができる
3. [ ] ログインできる
4. [ ] 利用規約同意モーダルが表示される
5. [ ] ダッシュボードが表示される

## 🎉 完了！

これで本番環境へのデプロイが完了しました。

## 📝 次にやること

### すぐにやるべきこと

1. **初期ユーザーの作成**
   - 管理者アカウントを作成
   - 適切なメールアドレスとパスワードを設定

2. **店舗情報の登録**
   - 「店舗管理」から店舗を追加
   - 店舗名、住所などを入力

3. **メンバーの招待**
   - 「組織設定」からメンバーを招待
   - 適切な権限を設定

### 余裕があればやること

1. **カスタムドメインの設定**
   - Vercelで独自ドメインを追加
   - DNSレコードを設定

2. **Edge Functionsのデプロイ**
   - AIチャット機能を使用する場合に必要
   - 詳細は `PRODUCTION_DEPLOYMENT.md` を参照

3. **Google Sheets連携**
   - データ同期機能を使用する場合に必要
   - Google Cloud Consoleで設定

4. **監視ツールの設定**
   - Sentryなどのエラートラッキング
   - アップタイム監視

## ❓ トラブルシューティング

### ログインできない

**症状**: ログインボタンを押しても何も起こらない

**解決策**:
1. ブラウザの開発者ツールでエラーを確認
2. Supabaseの認証設定（Site URL、Redirect URLs）が正しいか確認
3. 環境変数が正しく設定されているか確認

### データが表示されない

**症状**: ダッシュボードにデータが表示されない

**解決策**:
1. すべてのマイグレーションが正しく実行されたか確認
2. RLSポリシーが有効になっているか確認
3. ユーザーが組織に所属しているか確認

### ビルドエラー

**症状**: Vercelでのビルドが失敗する

**解決策**:
1. ローカルで `npm run build` を実行してエラーを確認
2. すべての環境変数が設定されているか確認
3. `node_modules` を削除して `npm install` を再実行

### AIチャットが動作しない

**症状**: AIチャットでエラーが発生する

**解決策**:
1. OpenAI APIキーが正しく設定されているか確認
2. OpenAI APIの使用量制限を確認
3. Edge Functionsがデプロイされているか確認（該当する場合）

## 📚 詳細ドキュメント

- 詳細なデプロイ手順: `PRODUCTION_DEPLOYMENT.md`
- デプロイチェックリスト: `DEPLOYMENT_CHECKLIST.md`
- 環境変数テンプレート: `.env.production.example`

## 💬 サポート

問題が解決しない場合は、以下を確認してください:

1. Supabase Dashboard でエラーログを確認
2. Vercel Dashboard でビルドログを確認
3. ブラウザの開発者ツールでコンソールエラーを確認

---

**おめでとうございます！AI経営管理システムが本番環境で稼働しています。**
