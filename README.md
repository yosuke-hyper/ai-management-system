# FoodValue AI - 飲食店経営管理システム

**AI搭載・マルチテナント対応の飲食店経営分析プラットフォーム**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)]()
[![Code-Splitting](https://img.shields.io/badge/Code--Splitting-98%25-success)]()
[![Performance](https://img.shields.io/badge/Lighthouse-95+-success)]()
[![License](https://img.shields.io/badge/license-Proprietary-orange)]()

---

## システム概要

複数店舗を運営する飲食事業者向けの総合経営管理システムです。日次・週次・月次の売上分析、KPI管理、AI分析レポート生成、目標管理など、経営に必要な機能をオールインワンで提供します。

### 主な特徴

- マルチテナント対応（組織・店舗・ブランド管理）
- AI搭載（ChatGPT-4統合・店舗別使用量制限）
- 役割ベースアクセス制御（5階層：システム管理者含む）
- サブスクリプション管理（機能ベース3プラン）
- CSVインポート（主要POS 5種類対応）
- 昼夜営業区分管理（ランチ・ディナー分離）
- 売上内訳詳細管理（決済手段別集計）
- 店舗ホリデー管理（営業カレンダー）
- リアルタイムダッシュボード
- 自動レポート生成・スケジュール配信
- システムヘルス監視・パフォーマンス追跡
- レポート編集追跡（完全な監査証跡）
- ゲーミフィケーション機能（ポイント・アバター）
- デモモード完備（7日間無料体験）
- オンボーディング機能（初回セットアップガイド・ツアー機能）
- エンタープライズレベルのセキュリティ
- Code-Splitting 98%実装（高速ロード）

---

## クイックスタート

### 1. 環境変数設定

```bash
# .env.example をコピー
cp .env.example .env

# 必要な環境変数を設定
nano .env
```

必須環境変数：
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 開発サーバー起動

```bash
npm run dev
```

http://localhost:5173 にアクセス

### 4. ビルド

```bash
npm run build
```

---

## 機能一覧

### コア機能

#### 1. ダッシュボード
- **日次ダッシュボード**: リアルタイム売上追跡、KPI表示、目標達成度確認
- **週次ダッシュボード**: 週間トレンド分析、店舗比較
- **月次ダッシュボード**: 月間収益分析、損益計算、詳細レポート

#### 2. データ管理
- **CSVインポート**: 5種類のPOSレジ対応（Airレジ、スマレジ、ユビレジ、Square、汎用）
- **手動入力**: 日報入力フォーム、月次経費入力
- **データエクスポート**: CSV/Excel形式で出力
- **昼夜営業区分**: ランチ・ディナーの分離管理
- **釣銭資金管理**: 店舗別の釣銭資金設定
- **売上内訳**: 現金・クレジット・電子マネー・QR決済の詳細管理
- **レポート編集追跡**: 編集履歴の自動記録

#### 3. 目標管理
- **月次目標**: 売上、客数、原価率、人件費率の目標設定
- **日次目標**: 日別の細かい目標設定
- **達成度追跡**: ダッシュボードでリアルタイムに進捗確認
- **テンプレート機能**: 業態別（居酒屋、カフェ、レストランなど）の推奨値を自動設定

#### 4. AI機能
- **AIチャット**: ChatGPT-4による経営相談
- **AI分析レポート**: 自動レポート生成
- **スケジュール配信**: 毎日/毎週/毎月の自動配信
- **使用量管理**: 店舗別AI使用量制限
- **日報フィードバック**: 日報入力時のAI分析コメント

#### 5. 分析機能
- **売上分析**: トレンド、前年比、店舗比較
- **コスト分析**: 原価率、人件費率、FL比率
- **収益性分析**: 営業利益率、損益計算
- **カレンダーヒートマップ**: 日別パフォーマンス可視化
- **営業時間帯分析**: ランチ・ディナー別の売上・客数分析
- **異常検知**: 過去データとの比較による異常値検出

#### 6. ゲーミフィケーション機能
- **ポイントシステム**: 日報入力でポイント獲得
- **連続入力ボーナス**: 毎日の継続でより多くのポイント
- **アバターカスタマイズ**: ポイントでアバターのアイテム購入
- **カスタマイズアイテム**: 衣装、帽子、持ち物など多数のアイテム
- **AIパートナー設定**: 組織全体のAI性格設定（フレンドリー/プロフェッショナル/シンプル）
- **ユーザー個別設定**: 個人ごとのゲーミフィケーション有効/無効切り替え

#### 7. オンボーディング機能
- **ウェルカムモーダル**: 新規ユーザー向けの初回案内
- **セットアップチェックリスト**: 必要な初期設定の進捗管理
- **インタラクティブツアー**: 画面操作のガイド付きチュートリアル
- **サンプルデータ生成**: デモデータで機能を体験
- **POSインポートウィザード**: 簡単なCSV取り込み設定

#### 8. システム管理機能
- **システムヘルス監視**: リアルタイムシステム状態監視
- **パフォーマンスメトリクス**: API応答時間、エラー率追跡
- **リソース使用量**: データベース、ストレージ使用状況
- **自動アラート**: 異常検知時の自動通知
- **システム管理者ダッシュボード**: 全組織横断の管理画面

### マルチテナント機能

#### 組織管理
- 組織作成・編集
- メンバー招待（メール通知）
- 役割ベースアクセス制御
- 店舗管理（作成・編集・削除）
- ブランド管理（複数ブランド・業態管理）
- 店舗ホリデー管理（定休日・営業カレンダー）
- 仕入先管理（カテゴリ別・店舗別割り当て）

#### 役割と権限（5階層）

| 役割 | 権限 |
|------|------|
| **システム管理者（super_admin）** | 全組織アクセス、システム監視、エラーログ管理 |
| **統括（admin）** | 組織内全権限、組織設定、メンバー管理、全店舗アクセス |
| **店長（manager）** | 担当店舗の全権限、レポート作成・編集 |
| **副店長（assistant_manager）** | 担当店舗の閲覧・入力、レポート作成 |
| **スタッフ（staff）** | 担当店舗の閲覧のみ |

---

## 料金プラン

FoodValue AIは、機能ベースの3プラン体系を採用しています。

### 通常料金（税抜）

| プラン | 月額 | 年額 | 推奨店舗数 | ユーザー数 | AI使用量/月 |
|--------|------|------|-----------|-----------|-------------|
| **Starter** | 5,980円 | 63,158円 | 1店舗 | 5名 | 50回 |
| **Standard** | 9,980円 | 109,780円 | 1〜5店舗 | 25名 | 300回 |
| **Premium** | 14,800円 | 159,840円 | 5〜20店舗 | 100名 | 2,000回 |

### キャンペーン料金（2025年12月〜2026年5月）

| プラン | 通常月額 | キャンペーン月額 | 割引率 |
|--------|---------|----------------|-------|
| **Starter** | 5,980円 | 3,588円 | 40%OFF |
| **Standard** | 9,980円 | 6,986円 | 30%OFF |
| **Premium** | 14,800円 | 11,840円 | 20%OFF |

### 料金体系の特徴

- **店舗数課金方式**: プラン単価 x 登録店舗数
- **14日間無料トライアル**: 全機能を無料で体験
- **年額プラン**: 約2ヶ月分お得
- **推奨店舗数を超えた運用も可能**: 追加料金で柔軟に対応
- **20店舗以上の大規模展開**: 見積もり対応

---

## デモモード

登録なしでシステムを体験できるデモモードを提供しています。

- **体験期間**: 7日間
- **完全分離**: 本番データと完全分離
- **固定データ**: 2ヶ月分のリアルなサンプルデータ
- **昼夜営業対応**: ランチ・ディナーの分離データ
- **2店舗・2ブランド**: マルチ店舗体験
- **セッション管理**: IPベースの追跡
- **共有リンク**: デモセッションの共有機能
- **AI機能完全動作**: チャット・レポート生成対応（10回/日制限）

---

## 技術スタック

### フロントエンド

- React 18.3 with Code-Splitting
- TypeScript 5.5
- Vite 5.4（最適化ビルド）
- Tailwind CSS 3.4
- React Router 6.28（Lazy Loading）
- Recharts 3.2（グラフ - 動的ロード）
- ExcelJS 4.4（エクスポート - 動的ロード）
- Lucide React（アイコン）
- React Hot Toast（通知）

### バックエンド

- Supabase（BaaS）
  - PostgreSQL データベース
  - Authentication（メール/パスワード認証）
  - Row Level Security（全テーブル実装）
  - Edge Functions（Deno）13個
  - Realtime subscriptions

### 開発ツール

- Vitest（ユニットテスト）
- Playwright（E2Eテスト）
- ESLint（リンター）
- TypeScript（型チェック）
- k6（負荷テスト）

---

## プロジェクト構造

```
project/
├── src/
│   ├── components/        # Reactコンポーネント
│   │   ├── Admin/        # 管理機能
│   │   ├── Avatar/       # アバター機能
│   │   ├── Chat/         # AIチャット
│   │   ├── Dashboard/    # ダッシュボード
│   │   ├── Demo/         # デモモード
│   │   ├── Onboarding/   # オンボーディング
│   │   ├── Organization/ # 組織管理
│   │   ├── Reports/      # レポート
│   │   ├── Stores/       # 店舗管理
│   │   ├── Tour/         # ツアー機能
│   │   └── ...
│   ├── contexts/         # React Context
│   ├── hooks/            # カスタムフック
│   ├── lib/              # ユーティリティ
│   ├── pages/            # ページコンポーネント（26ページ）
│   ├── services/         # ビジネスロジック
│   ├── types/            # TypeScript型定義
│   └── utils/            # ヘルパー関数
│
├── supabase/
│   ├── functions/        # Edge Functions（13個）
│   │   ├── ai-usage-proxy/       # AI使用量プロキシ
│   │   ├── analyze-daily-report/ # 日報分析
│   │   ├── chat-gpt/             # AIチャット
│   │   ├── check-notifications/  # 通知チェック
│   │   ├── detect-anomaly/       # 異常検知
│   │   ├── generate-ai-report/   # レポート生成
│   │   ├── health-check/         # ヘルスチェック
│   │   ├── log-error/            # エラーログ
│   │   ├── scheduled-report-generator/ # スケジュール実行
│   │   ├── send-invitation-email/      # 招待メール
│   │   ├── send-report-email/          # レポートメール
│   │   ├── send-support-request-email/ # サポートメール
│   │   └── sync-to-sheets/             # Sheets連携
│   └── migrations/       # データベースマイグレーション（220+ファイル）
│
├── load-tests/           # 負荷テスト
├── e2e/                  # E2Eテスト
└── scripts/              # ビルドスクリプト
```

---

## データベース設計

### 主要テーブル

```sql
-- 組織・ユーザー
organizations          # 組織（AI性格設定含む）
profiles              # ユーザープロフィール（ゲーミフィケーション設定含む）
organization_members  # 組織メンバー
system_admins         # システム管理者

-- 店舗・ブランド
stores                # 店舗（釣銭資金設定、営業終了時間含む）
brands                # ブランド・業態
store_holidays        # 店舗休日カレンダー
vendors               # 仕入先
vendor_categories     # 仕入先カテゴリ

-- データ
daily_reports         # 日次レポート（昼夜営業区分、売上内訳、編集追跡）
monthly_expenses      # 月次経費
targets               # 目標
daily_targets         # 日次目標
expense_baselines     # 経費ベースライン

-- AI機能
ai_conversations      # AI会話
ai_messages          # AIメッセージ
ai_reports           # AIレポート
ai_usage_settings    # AI使用量設定

-- ゲーミフィケーション
avatar_items         # アバターアイテム（衣装、帽子、持ち物）
user_avatar_items    # ユーザー所有アイテム

-- オンボーディング
onboarding_progress  # オンボーディング進捗
tour_progress        # ツアー進捗
import_history       # インポート履歴

-- 通知・ログ
notifications        # 通知
audit_logs          # 監査ログ（自動トリガー）
error_logs          # エラーログ
system_health_metrics # システムヘルスメトリクス

-- サブスクリプション
subscription_plans   # プラン
organization_subscriptions # サブスクリプション

-- デモ
demo_sessions       # デモセッション（7日間有効）
demo_stores         # デモ店舗
demo_daily_reports  # デモレポート
demo_ai_usage       # デモAI使用量
```

---

## セキュリティ

### 実装済み対策

- Row Level Security（RLS）全テーブル実装（100%）
- 組織単位のデータ分離（マルチテナント完全分離）
- 5階層権限管理（システム管理者〜スタッフ）
- パスワード暗号化（Supabase Auth）
- SQL Injection対策（Prepared Statements）
- XSS対策（入力サニタイゼーション）
- CSRF対策（トークン検証）
- 環境変数でシークレット管理
- HTTPS必須
- セキュアヘッダー設定
- レート制限（Edge Functions）
- セッション管理（自動タイムアウト）

### 監査・追跡

- 全操作の監査ログ記録（自動トリガー）
- レポート編集追跡（誰が・いつ・何を）
- ユーザーアクション追跡
- IP記録・セッション追跡
- タイムスタンプ記録
- エラーログ記録（Edge Functions経由）
- システムヘルスメトリクス記録

---

## 通知システム

- **リアルタイム通知**: ブラウザ内通知
- **メール通知**: レポート配信、招待メール、サポート問い合わせ
- **自動アラート**:
  - 目標未達成警告
  - AI使用量警告
  - トライアル期限通知（7日前、3日前、1日前）

---

## 対応POSレジ

### 1. Airレジ
- 日次レポートCSV対応
- 自動カラムマッピング

### 2. スマレジ
- 日次・月次レポート対応
- 商品分類別集計

### 3. ユビレジ
- 売上明細CSV対応
- 時間帯別分析

### 4. Square
- 決済レポート対応
- 手数料自動計算

### 5. 汎用フォーマット
- カスタムCSV対応
- テンプレート提供

---

## テスト

### ユニットテスト（Vitest）

```bash
# テスト実行
npm run test

# カバレッジ付き
npm run test:coverage

# UIモード
npm run test:ui
```

### E2Eテスト（Playwright）

```bash
# E2Eテスト実行
npm run test:e2e

# UIモード（デバッグ用）
npm run test:e2e:ui

# ヘッドありモード
npm run test:e2e:headed
```

### 負荷テスト（k6）

```bash
# すべての負荷テストを実行
npm run loadtest

# 個別実行
npm run loadtest:basic    # 基本負荷テスト（100ユーザー）
npm run loadtest:stress   # ストレステスト（1000ユーザー）
npm run loadtest:spike    # スパイクテスト
npm run loadtest:endurance # 持久テスト（2時間）
```

---

## パフォーマンス

### 実績値（2025年12月最適化後）

- First Contentful Paint: 0.8-1.2s
- Time to Interactive: 1.5-2.5s
- Lighthouse Score: 95+
- 初期ロードサイズ: 349KB (gzip)
- ビルド時間: 92秒
- Code-Splitting実装率: 98%

### Code-Splitting最適化実績

**初期ロード最適化:**
- コアバンドル (index.js): 90KB (gzip)
- React関連 (react-vendor): 105KB (gzip)
- チャート関連 (chart-vendor): 153KB (gzip)

**動的ロード（オンデマンド）:**
- ページコンポーネント: 26ページが動的ロード
- 管理画面タブ: 12+コンポーネントが動的ロード
- Excel/CSVエクスポート: 256KB (gzip) - 使用時のみロード

---

## デプロイ

### Netlify

```bash
# ビルド設定
Build command: npm run build
Publish directory: dist
```

### Vercel

```bash
# vercel.json が用意されています
vercel --prod
```

### 環境変数

必須：
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Edge Functions用：
```bash
OPENAI_API_KEY=sk-xxx        # AIチャット
RESEND_API_KEY=re_xxx        # メール送信
GOOGLE_SHEETS_API_KEY=xxx    # Sheets連携
```

---

## ドキュメント

### セットアップガイド（docs/setup/）
- [OpenAI設定](./docs/setup/OPENAI_SETUP.md)
- [ChatGPT設定](./docs/setup/CHATGPT_SETUP.md)
- [Google Sheets連携](./docs/setup/GOOGLE_SHEETS_SETUP.md)
- [メール通知設定](./docs/setup/EMAIL_NOTIFICATION_SETUP.md)
- [SMTP設定（IONOS）](./docs/setup/IONOS_SMTP_SETUP.md)
- [レポートスケジューラー](./docs/setup/REPORT_SCHEDULER_SETUP.md)
- [POS別設定ガイド](./docs/setup/POS_SETUP_GUIDES.md)

### 運用ガイド（docs/operations/）
- [日常運用ガイド](./docs/operations/DAILY_OPERATION_GUIDE.md)
- [CSVインポートマニュアル](./docs/operations/CSV_IMPORT_USER_MANUAL.md)
- [バックアップ・リカバリ](./docs/operations/BACKUP_AND_RECOVERY_GUIDE.md)
- [監視・インシデント対応](./docs/operations/MONITORING_AND_INCIDENT_RESPONSE_GUIDE.md)
- [デプロイメントチェックリスト](./docs/operations/DEPLOYMENT_CHECKLIST.md)

### アーキテクチャ（docs/architecture/）
- [システム概要](./docs/architecture/SYSTEM_OVERVIEW.md)
- [マルチテナント設計](./docs/architecture/MULTITENANT_ARCHITECTURE.md)
- [システムヘルス監視](./docs/architecture/SYSTEM_HEALTH_MONITORING.md)

---

## ロードマップ

### フェーズ1: リリース準備（完了）
- [x] コア機能実装
- [x] マルチテナント対応
- [x] セキュリティ実装
- [x] ドキュメント整備
- [x] テスト実装

### フェーズ2: 本番リリース（進行中）
- [x] 負荷テスト実施
- [x] オンボーディング機能
- [x] ツアー機能
- [ ] ベータユーザー募集
- [ ] 正式リリース

### フェーズ3: 機能拡張（計画中）
- [ ] モバイルアプリ（iOS/Android）
- [ ] 多言語対応（英語）
- [ ] 高度なAI分析
- [ ] 在庫管理機能
- [ ] 勤怠管理統合
- [ ] API公開

---

## サポート

### ヘルプ機能
- アプリ内FAQ（AIアシスタント）
  - 日報入力方法
  - 目標達成度の確認方法
  - 月次目標の入力方法
  - ポイントとアバターカスタマイズ
- インタラクティブツアー
- オンボーディングチェックリスト

### 技術サポート
- アプリ内サポート問い合わせフォーム
- メールサポート
- チャットサポート（Premiumプランのみ）

---

## 統計

```
総コード行数: 55,000+ 行
TypeScript: 100%
コンポーネント数: 160+
ページ数: 26
Edge Functions: 13個
データベースマイグレーション: 220+ファイル
テストカバレッジ: 85%+
ドキュメントページ: 15
サポートPOSレジ: 5種類
対応ブラウザ: Chrome, Firefox, Safari, Edge
Code-Splitting実装率: 98%
初期ロードサイズ: 349KB (gzip)
動的チャンク数: 60+
```

---

## ライセンス

Proprietary - All rights reserved

---

**Version 1.0.0** | Built for Restaurant Owners | 2026年1月版 | Code-Splitting 98%最適化済み
