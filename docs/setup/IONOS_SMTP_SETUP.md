# Ionos SMTP設定ガイド

このガイドでは、Ionos SMTPサーバーを使用してメール送信機能を設定する方法を説明します。

## 1. 環境変数の設定

Supabaseダッシュボードで以下の環境変数を設定します：

```bash
SMTP_HOST=smtp-1and1.live.ixa.po.server.lan
SMTP_PORT=587
SMTP_USER=mp1063669557-1764001950716
SMTP_PASSWORD=Food/Value/Solution_2025
SMTP_FROM_EMAIL=info@smartfoodlocker.tech
SMTP_FROM_NAME=FoodValue AI
```

### Supabaseダッシュボードでの設定方法

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「Settings」→「Edge Functions」を選択
4. 「Environment Variables」セクションで「Add Variable」をクリック
5. 上記の環境変数を1つずつ追加

## 2. Edge Functionsのデプロイ

以下のEdge Functionsが更新されました：

- `send-invitation-email` - 組織への招待メール
- `send-report-email` - レポート送信メール
- `send-support-request-email` - サポートリクエストメール

### デプロイ方法

Supabase CLIを使用してデプロイ：

```bash
# 招待メール機能
supabase functions deploy send-invitation-email

# レポートメール機能
supabase functions deploy send-report-email

# サポートリクエストメール機能
supabase functions deploy send-support-request-email
```

## 3. メール送信テスト

### サポートページからテスト

1. アプリケーションの「サポート」ページにアクセス
2. お問い合わせフォームを入力して送信
3. 以下のメールが届くことを確認：
   - 管理者宛（info@smartfoodlocker.tech）：お問い合わせ通知メール
   - ユーザー宛：自動返信メール

### 招待メールのテスト

1. 管理者アカウントでログイン
2. 「組織設定」→「メンバー管理」から新しいメンバーを招待
3. 招待されたメールアドレスに招待メールが届くことを確認

### レポートメールのテスト

1. マネージャー以上の権限でログイン
2. AIレポートを生成
3. レポート詳細画面から「メール送信」ボタンをクリック
4. 受信者のメールアドレスに綺麗にフォーマットされたレポートメールが届くことを確認

## 4. トラブルシューティング

### メールが送信されない場合

1. **環境変数の確認**
   - Supabaseダッシュボードで環境変数が正しく設定されているか確認
   - 特にパスワードに特殊文字が含まれる場合は、正しくエスケープされているか確認

2. **ログの確認**
   - Supabaseダッシュボードの「Logs」タブでEdge Functionsのログを確認
   - エラーメッセージがないかチェック

3. **SMTP接続の確認**
   - ポート587がファイアウォールでブロックされていないか確認
   - Ionosアカウントでメール送信が有効になっているか確認

### よくあるエラー

#### "Connection refused"
- SMTPホスト名またはポート番号が間違っている可能性があります
- `SMTP_HOST`と`SMTP_PORT`の値を再確認してください

#### "Authentication failed"
- ユーザー名またはパスワードが間違っている可能性があります
- `SMTP_USER`と`SMTP_PASSWORD`の値を再確認してください

#### "Sender address rejected"
- 送信元メールアドレスがIonosアカウントで設定されていない可能性があります
- `SMTP_FROM_EMAIL`がIonosで認証されたドメインのメールアドレスであることを確認してください

## 5. セキュリティに関する注意事項

- パスワードは環境変数として安全に保管されています
- 環境変数は絶対にGitにコミットしないでください
- 定期的にパスワードを変更することをお勧めします
- メール送信のログは監査目的で記録されます

## 6. メールテンプレートのカスタマイズ

メールテンプレートは以下のファイルで管理されています：

- `/supabase/functions/send-invitation-email/index.ts`
- `/supabase/functions/send-report-email/index.ts`
- `/supabase/functions/send-support-request-email/index.ts`

各ファイル内の`emailHtml`変数を編集することで、メールのデザインをカスタマイズできます。

## 7. 送信レート制限

Ionos SMTPには送信レート制限がある場合があります：

- 1時間あたりの送信数制限
- 1日あたりの送信数制限

大量のメールを送信する場合は、Ionosのサポートに制限を確認してください。

## 8. 本番環境への移行

開発環境でテストが完了したら：

1. 本番環境のSupabaseプロジェクトでも同じ環境変数を設定
2. Edge Functionsを本番環境にデプロイ
3. 本番環境でメール送信テストを実施
4. 問題がなければ、本番環境でメール送信機能を有効化
