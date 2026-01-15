#!/bin/bash

# E2Eテスト環境セットアップチェッカー
# このスクリプトは、E2Eテストを実行する準備ができているか確認します

echo "🔍 E2Eテスト環境チェック"
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# チェック1: Node.jsバージョン
echo "1. Node.jsバージョンチェック..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "   ${GREEN}✓${NC} Node.js $NODE_VERSION がインストール済み"

    # バージョン番号を抽出（v18.x.x -> 18）
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "   ${YELLOW}⚠${NC} Node.js v18以上を推奨（現在: $NODE_VERSION）"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "   ${RED}✗${NC} Node.jsがインストールされていません"
    ERRORS=$((ERRORS+1))
fi

# チェック2: npm
echo ""
echo "2. npmチェック..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "   ${GREEN}✓${NC} npm $NPM_VERSION がインストール済み"
else
    echo -e "   ${RED}✗${NC} npmがインストールされていません"
    ERRORS=$((ERRORS+1))
fi

# チェック3: node_modules
echo ""
echo "3. 依存関係チェック..."
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} node_modulesが存在します"

    # Playwrightチェック
    if [ -d "node_modules/@playwright" ]; then
        echo -e "   ${GREEN}✓${NC} Playwrightがインストール済み"
    else
        echo -e "   ${RED}✗${NC} Playwrightがインストールされていません"
        echo "      → npm install を実行してください"
        ERRORS=$((ERRORS+1))
    fi
else
    echo -e "   ${RED}✗${NC} node_modulesが見つかりません"
    echo "      → npm install を実行してください"
    ERRORS=$((ERRORS+1))
fi

# チェック4: Playwrightブラウザ
echo ""
echo "4. Playwrightブラウザチェック..."
if [ -d "$HOME/.cache/ms-playwright" ] || [ -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo -e "   ${GREEN}✓${NC} Playwrightブラウザがインストール済み"
else
    echo -e "   ${YELLOW}⚠${NC} Playwrightブラウザが見つかりません"
    echo "      → npx playwright install --with-deps を実行してください"
    WARNINGS=$((WARNINGS+1))
fi

# チェック5: .env.test
echo ""
echo "5. 環境変数ファイルチェック..."
if [ -f ".env.test" ]; then
    echo -e "   ${GREEN}✓${NC} .env.testが存在します"

    # 必要な変数をチェック
    if grep -q "E2E_ADMIN_EMAIL" .env.test; then
        echo -e "   ${GREEN}✓${NC} E2E_ADMIN_EMAIL が設定されています"
    else
        echo -e "   ${YELLOW}⚠${NC} E2E_ADMIN_EMAIL が設定されていません"
        WARNINGS=$((WARNINGS+1))
    fi

    if grep -q "E2E_ADMIN_PASSWORD" .env.test; then
        echo -e "   ${GREEN}✓${NC} E2E_ADMIN_PASSWORD が設定されています"
    else
        echo -e "   ${YELLOW}⚠${NC} E2E_ADMIN_PASSWORD が設定されていません"
        WARNINGS=$((WARNINGS+1))
    fi

    if grep -q "VITE_SUPABASE_URL" .env.test; then
        echo -e "   ${GREEN}✓${NC} VITE_SUPABASE_URL が設定されています"
    else
        echo -e "   ${YELLOW}⚠${NC} VITE_SUPABASE_URL が設定されていません"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "   ${RED}✗${NC} .env.testが見つかりません"
    echo "      → .env.test を作成してください（e2e/QUICKSTART.md参照）"
    ERRORS=$((ERRORS+1))
fi

# チェック6: devサーバー
echo ""
echo "6. devサーバーチェック..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} devサーバーが起動中（http://localhost:5173）"
else
    echo -e "   ${YELLOW}⚠${NC} devサーバーが起動していません"
    echo "      → 別ターミナルで 'npm run dev' を実行してください"
    WARNINGS=$((WARNINGS+1))
fi

# チェック7: テストファイル
echo ""
echo "7. テストファイルチェック..."
if [ -d "e2e/tests" ]; then
    TEST_COUNT=$(find e2e/tests -name "*.spec.ts" | wc -l)
    echo -e "   ${GREEN}✓${NC} テストファイルが見つかりました（$TEST_COUNT ファイル）"
else
    echo -e "   ${RED}✗${NC} e2e/tests ディレクトリが見つかりません"
    ERRORS=$((ERRORS+1))
fi

# 結果サマリー
echo ""
echo "================================"
echo "チェック完了"
echo "================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ すべてのチェックが成功しました！${NC}"
    echo ""
    echo "E2Eテストを実行できます："
    echo "  npm run test:e2e:ui      # UIモード（推奨）"
    echo "  npm run test:e2e         # コマンドライン"
    echo "  npm run test:e2e:debug   # デバッグモード"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS 個の警告があります${NC}"
    echo ""
    echo "警告がありますが、テストは実行可能です。"
    echo "最適な環境にするには、警告を解決してください。"
    echo ""
    echo "E2Eテストを実行："
    echo "  npm run test:e2e:ui"
    exit 0
else
    echo -e "${RED}✗ $ERRORS 個のエラーがあります${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS 個の警告があります${NC}"
    fi
    echo ""
    echo "エラーを解決してからテストを実行してください。"
    echo ""
    echo "セットアップガイド："
    echo "  cat e2e/QUICKSTART.md"
    echo "  cat E2E_LOCAL_SETUP_GUIDE.md"
    exit 1
fi
