# 飲食店向け業務報告システム

LINE Botで売上・経費を報告し、Google Sheetsに保存、Webダッシュボードで可視化するシステム

## 📋 機能概要

### 1. LINE Bot入力機能
- 店舗スタッフがLINEで日次報告
- 売上、仕入れ、各種経費を簡単入力
- テキスト形式での報告も可能

### 2. データ管理
- Google Sheetsに自動保存
- SQLite（一時保存）
- 将来的にSupabase/PostgreSQL移行対応

### 3. Webダッシュボード
- 売上推移の棒グラフ
- 経費比率の円グラフ  
- 日次/週次/月次集計表
- リアルタイム更新

### 4. AI チャット機能
- 「今月の売上合計は？」
- 「経費比率はどうなっている？」
- データに基づいた回答

## 🏗️ システム構成

```
フロントエンド: React + TypeScript + Tailwind CSS
バックエンド: Python Flask API
データベース: Google Sheets API (+ SQLite)
LINE Bot: LINE Messaging API
デプロイ: Bolt (WebContainer)
```

## 🚀 開発手順

1. **基本構成セットアップ** ✅
2. **Python API サーバー** ✅
3. **フロントエンド修正**
4. **Google Sheets 連携**
5. **LINE Bot 実装**
6. **AI チャット強化**

## 📊 データ項目

- 売上
- 仕入れ（材料費）
- 人件費
- 水光熱費
- 販促費
- 清掃費
- 雑費
- 通信費
- その他
- 報告内容（テキスト）

## 🔧 環境変数

```bash
# デモ／本番切り替え
VITE_USE_SUPABASE=false  # デモモード（true=本番モード）

# Supabase設定（本番時のみ必要）
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
VITE_GOOGLE_SHEET_ID=your_google_sheet_id

# LINE Bot
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token

# OpenAI API（Supabase Edge Functions用）
OPENAI_API_KEY=your_openai_api_key
```

## 📈 開発状況

### 🎯 本番環境リセット完了
- [x] Supabaseデータベースをクリーンな状態にリセット
- [x] デモデータは`VITE_USE_SUPABASE=false`時のみ表示
- [x] 本番環境は空の状態から開始
- [x] セキュリティポリシー（RLS）準備完了

### 📊 データモード
- **デモモード** (`VITE_USE_SUPABASE=false`): 4店舗の豊富なモックデータ
- **本番モード** (`VITE_USE_SUPABASE=true`): 空のデータベースから開始

- [x] プロジェクト構成整理
- [x] Python API サーバー（基本）
- [x] データ型定義
- [x] モックデータ準備
- [x] フロントエンド修正
- [x] ロール別権限管理システム
- [x] Google Sheets 連携 ✨ NEW!
- [x] 本番環境のデータリセット ✨ NEW!
- [ ] LINE Bot 実装
- [ ] AI チャット強化# Vercel Deployment
