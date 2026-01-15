# メール通知システム - セットアップガイド

**作成日**: 2025年11月10日
**バージョン**: 1.0.0

---

## 📧 概要

このシステムには、Resendを使用したメール通知機能が完全に実装されています。

### 実装済みの機能

✅ **AIレポート完成通知メール**
- レポート生成完了時に自動送信
- 主要KPIをHTML形式で表示
- レポート詳細ページへのリンク付き

✅ **メンバー招待メール**
- 新規メンバー招待時に自動送信
- 美しいHTMLテンプレート
- ワンクリックで参加可能

✅ **パスワードリセットメール**
- Supabase Authの標準機能を使用

✅ **内部通知システム**
- AI使用量アラート
- トライアル期限通知
- 目標達成通知
- 新メンバー追加通知
- その他10種類以上の通知テンプレート

---

## 🚀 セットアップ手順

### ステップ1: Resendアカウントの作成

1. [Resend](https://resend.com/)にアクセス
2. 「Sign Up」をクリックして無料アカウントを作成
3. メールアドレスを確認

**無料プラン**:
- 月間3,000通まで無料
- 開発・テスト用途に最適

### ステップ2: APIキーの取得

1. Resendダッシュボードにログイン
2. 左メニューから「API Keys」をクリック
3. 「Create API Key」をクリック
4. 名前を入力（例: `Production API Key`）
5. 「Full Access」を選択
6. APIキーをコピー（一度しか表示されません）

**APIキーの形式**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### ステップ3: ドメインの設定（本番環境のみ）

開発環境では、ResendのデフォルトドメインでメールB送信できます。

**本番環境では独自ドメインの設定が必要です**:

1. Resendダッシュボードで「Domains」を選択
2. 「Add Domain」をクリック
3. 使用するドメイン名を入力（例: `yourdomain.com`）
4. 表示されるDNSレコードをドメイン管理画面に追加:
   ```
   タイプ: TXT
   名前: _resend
   値: <Resendが提供する値>

   タイプ: MX
   名前: @
   値: feedback-smtp.resend.com (優先度: 10)
   ```
5. DNS伝播を待つ（最大48時間、通常は数分）
6. 「Verify Domain」をクリック

### ステップ4: Supabase環境変数の設定

#### 方法1: Supabase Dashboardから設定（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. 左メニューから「Project Settings」→「Edge Functions」を選択
4. 「Add Secret」をクリック
5. 以下を追加:
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. 「Save」をクリック

#### 方法2: Supabase CLIから設定

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref your-project-ref

# シークレットを設定
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ステップ5: Edge Functionsのデプロイ

このプロジェクトには2つのメール送信用Edge Functionsがあります:

#### 1. send-report-email
AIレポート完成通知用

#### 2. send-invitation-email
メンバー招待用

**デプロイコマンド**:
```bash
# 1つずつデプロイ
supabase functions deploy send-report-email
supabase functions deploy send-invitation-email

# または一括デプロイ
supabase functions deploy
```

### ステップ6: 送信元メールアドレスの設定

Edge Function内の送信元アドレスを変更する必要があります:

#### send-report-email/index.ts
```typescript
// 133行目付近
from: 'レポート配信 <reports@updates.yourdomain.com>',
```

#### send-invitation-email/index.ts
```typescript
// 185行目付近
from: 'AI Management System <noreply@yourdomain.com>',
```

**変更後、再デプロイが必要です**:
```bash
supabase functions deploy send-report-email
supabase functions deploy send-invitation-email
```

---

## 🧪 テスト方法

### 1. デモモードでのテスト

APIキーを設定しない場合、自動的にデモモードで動作します:
- メールは送信されませんが、処理は正常に完了します
- ログに詳細情報が出力されます

### 2. Resend Test Mode

Resendのテストモードを使用:
```typescript
// Edge Functionで
const resendResponse = await fetch('https://api.resend.com/emails', {
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'X-Entity-Ref-ID': 'test-mode', // テストモード
  }
})
```

### 3. 実際のメール送信テスト

1. 組織にメンバーを招待する
2. Resendダッシュボードで「Emails」を確認
3. 送信ステータスを確認:
   - ✅ Delivered: 配信成功
   - ⏳ Sending: 送信中
   - ❌ Failed: 失敗（エラー内容を確認）

---

## 📊 使用方法

### AIレポート完成通知の送信

```typescript
import { sendReportEmail } from '@/services/emailService'

// レポート生成後
const result = await sendReportEmail({
  reportId: 'report-uuid',
  recipientEmail: 'user@example.com'
})

if (result.success) {
  console.log('メール送信成功:', result.messageId)
} else {
  console.error('メール送信失敗:', result.error)
}
```

### メンバー招待メールの送信

```typescript
import { sendInvitationEmail } from '@/services/emailService'

// 招待作成時（自動的に送信されます）
const invitation = await createInvitation(
  organizationId,
  'newmember@example.com',
  'manager',
  currentUserId
)
// ↑ 内部でsendInvitationEmailが自動的に呼ばれます
```

### 内部通知の作成

```typescript
import { notificationService, NotificationTemplates } from '@/services/notificationService'

// AI使用量アラート
const template = NotificationTemplates.aiUsageThresholdReached(85, 850, 1000)
await notificationService.create({
  userId: user.id,
  organizationId: org.id,
  ...template
})

// 目標達成通知
const goalTemplate = NotificationTemplates.goalAchievement(
  '新宿店',
  105,
  1000000,
  1050000
)
await notificationService.create({
  userId: manager.id,
  organizationId: org.id,
  ...goalTemplate
})
```

---

## 🎨 メールテンプレートのカスタマイズ

### レポートメールのカスタマイズ

`supabase/functions/send-report-email/index.ts`の84〜180行目:

```typescript
const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <!-- ここでスタイルをカスタマイズ -->
  <style>
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    /* 色やフォントを変更 */
  </style>
</head>
<body>
  <!-- HTMLコンテンツ -->
</body>
</html>
`;
```

### 招待メールのカスタマイズ

`supabase/functions/send-invitation-email/index.ts`の68〜164行目:

```typescript
const emailHtml = `
<!DOCTYPE html>
<html>
  <!-- ロゴ、色、文言をカスタマイズ -->
</html>
`;
```

**変更後は必ず再デプロイ**:
```bash
supabase functions deploy send-report-email
supabase functions deploy send-invitation-email
```

---

## 🔧 トラブルシューティング

### メールが届かない

**1. Resend Dashboardを確認**
- 「Emails」セクションで送信ステータスを確認
- エラーメッセージを確認

**2. APIキーを確認**
```bash
supabase secrets list | grep RESEND_API_KEY
```

**3. Edge Functionのログを確認**
```bash
supabase functions logs send-report-email
supabase functions logs send-invitation-email
```

**4. ドメイン検証を確認**
- ResendダッシュボードでDomain statusが「Verified」か確認

### よくあるエラー

#### Error: "API key is invalid"
→ APIキーが正しく設定されていない
```bash
supabase secrets set RESEND_API_KEY=re_correct_key_here
```

#### Error: "Domain not verified"
→ ドメインのDNS設定が完了していない
→ Resendダッシュボードで設定を確認

#### Error: "Rate limit exceeded"
→ 送信制限に達した
→ Resendプランを確認（無料プラン: 3,000通/月）

#### Error: "Invalid from address"
→ 送信元アドレスが未検証
→ Resendでドメインを検証するか、`onboarding@resend.dev`を使用

---

## 💰 料金プラン

### Resend料金

| プラン | 月額 | 送信数 | 特徴 |
|--------|------|--------|------|
| **Free** | $0 | 3,000通 | 開発・テスト用 |
| **Pro** | $20 | 50,000通 | 本番環境推奨 |
| **Enterprise** | カスタム | 無制限 | 大規模利用 |

**従量課金**: 上限を超えた場合、1,000通ごとに$1

### 使用量の目安

**想定シナリオ**（月間）:
- 組織数: 100
- ユーザー数: 500
- メール種別:
  - 招待メール: 50通
  - レポート通知: 400通（週次レポート × 4週 × 100組織）
  - その他通知: 100通

**合計**: 約550通/月 → **無料プランで十分**

---

## 🔐 セキュリティのベストプラクティス

### 1. APIキーの管理

❌ **絶対にしないこと**:
```typescript
// フロントエンドで直接APIキーを使用
const RESEND_API_KEY = 're_xxxxxxxxxxxx' // NG!
```

✅ **正しい方法**:
- Edge Functionsでのみ使用
- Supabase Secretsに保存
- 環境変数として管理

### 2. メールアドレスの検証

```typescript
// メール送信前にバリデーション
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  throw new Error('無効なメールアドレス')
}
```

### 3. レート制限

```typescript
// 1ユーザーあたりの送信制限を実装
const MAX_EMAILS_PER_HOUR = 10

// Supabaseのrate_limitテーブルで管理
```

---

## 📈 監視とログ

### 送信成功率の監視

```typescript
// Edge Functionで
console.log('Email sent successfully:', {
  messageId: result.id,
  recipient: recipientEmail,
  timestamp: new Date().toISOString()
})
```

### Resend Analyticsの活用

Resendダッシュボードで以下を確認:
- 送信数
- 配信率
- バウンス率
- クリック率（リンクがある場合）

---

## 🎯 次のステップ

### 追加実装推奨機能

1. **定期レポートの自動配信**
   ```bash
   # Supabase Cron Job
   SELECT cron.schedule(
     'weekly-reports',
     '0 9 * * 1',  -- 毎週月曜 9:00
     $$ SELECT net.http_post(...) $$
   );
   ```

2. **メール送信履歴テーブル**
   ```sql
   CREATE TABLE email_logs (
     id uuid PRIMARY KEY,
     email_type text,
     recipient text,
     sent_at timestamptz,
     status text,
     message_id text
   );
   ```

3. **メール設定ページ**
   - ユーザーごとの通知設定
   - メール受信のオン/オフ
   - 送信頻度の設定

4. **HTMLメールのプレビュー機能**
   - 送信前にプレビュー
   - テストメールの送信

---

## 📚 参考リンク

- [Resend公式ドキュメント](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [メールHTML作成ガイド](https://www.caniemail.com/)

---

## ✅ チェックリスト

### 開発環境
- [ ] Resendアカウント作成
- [ ] APIキー取得
- [ ] Supabase Secretsに設定
- [ ] Edge Functionsデプロイ
- [ ] テストメール送信成功

### 本番環境
- [ ] 独自ドメインの設定
- [ ] DNS設定完了
- [ ] ドメイン検証完了
- [ ] 送信元アドレスの変更
- [ ] Edge Functions再デプロイ
- [ ] 本番環境でテスト送信
- [ ] 監視とアラートの設定

---

**設定完了後、メール通知システムが完全に機能します！** 🎉
