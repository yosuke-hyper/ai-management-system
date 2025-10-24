#!/bin/bash

# ========================================
# AI経営管理システム - 本番環境確認スクリプト
# ========================================

echo "========================================="
echo "AI経営管理システム - 本番環境確認"
echo "========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック結果のカウンター
PASSED=0
FAILED=0
WARNING=0

# チェック関数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
    ((WARNING++))
}

# 環境変数のチェック
echo "1. 環境変数の確認"
echo "-------------------"

if [ -f .env.production ]; then
    check_pass ".env.production ファイルが存在します"

    # 必須環境変数のチェック
    source .env.production

    if [ ! -z "$VITE_SUPABASE_URL" ]; then
        check_pass "VITE_SUPABASE_URL が設定されています"
    else
        check_fail "VITE_SUPABASE_URL が設定されていません"
    fi

    if [ ! -z "$VITE_SUPABASE_ANON_KEY" ]; then
        check_pass "VITE_SUPABASE_ANON_KEY が設定されています"
    else
        check_fail "VITE_SUPABASE_ANON_KEY が設定されていません"
    fi

    if [ ! -z "$VITE_OPENAI_API_KEY" ]; then
        check_pass "VITE_OPENAI_API_KEY が設定されています"
    else
        check_warn "VITE_OPENAI_API_KEY が設定されていません（Edge Functions経由の場合は不要）"
    fi

    if [ "$VITE_DEMO_MODE" = "false" ]; then
        check_pass "VITE_DEMO_MODE が false に設定されています"
    else
        check_fail "VITE_DEMO_MODE が false に設定されていません"
    fi

    if [ "$NODE_ENV" = "production" ]; then
        check_pass "NODE_ENV が production に設定されています"
    else
        check_warn "NODE_ENV が production に設定されていません"
    fi
else
    check_fail ".env.production ファイルが存在しません"
fi

echo ""

# ビルド確認
echo "2. ビルドの確認"
echo "-------------------"

if npm run build > /dev/null 2>&1; then
    check_pass "ビルドが成功しました"
else
    check_fail "ビルドが失敗しました"
fi

if [ -d "dist" ]; then
    check_pass "dist ディレクトリが作成されています"

    if [ -f "dist/index.html" ]; then
        check_pass "index.html が生成されています"
    else
        check_fail "index.html が生成されていません"
    fi
else
    check_fail "dist ディレクトリが作成されていません"
fi

echo ""

# 設定ファイルの確認
echo "3. 設定ファイルの確認"
echo "-------------------"

if [ -f "vercel.json" ]; then
    check_pass "vercel.json が存在します"
else
    check_warn "vercel.json が存在しません（Vercelを使用しない場合は問題ありません）"
fi

if [ -f "netlify.toml" ]; then
    check_pass "netlify.toml が存在します"
else
    check_warn "netlify.toml が存在しません（Netlifyを使用しない場合は問題ありません）"
fi

echo ""

# セキュリティチェック
echo "4. セキュリティチェック"
echo "-------------------"

# .gitignoreの確認
if grep -q ".env.production" .gitignore; then
    check_pass ".env.production が .gitignore に含まれています"
else
    check_fail ".env.production が .gitignore に含まれていません（重大なセキュリティリスク）"
fi

# service_role_keyの確認
if grep -r "service_role" src/ 2>/dev/null | grep -v "\.md" > /dev/null; then
    check_fail "ソースコードに service_role_key への参照が含まれています（セキュリティリスク）"
else
    check_pass "ソースコードに service_role_key への参照がありません"
fi

# ハードコードされたAPIキーの確認
if grep -r "sk-" src/ 2>/dev/null | grep -v "example" | grep -v "\.md" > /dev/null; then
    check_warn "ソースコードにAPIキーらしき文字列が含まれています"
else
    check_pass "ソースコードにハードコードされたAPIキーがありません"
fi

echo ""

# マイグレーションファイルの確認
echo "5. マイグレーションファイルの確認"
echo "-------------------"

if [ -d "supabase/migrations" ]; then
    migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    check_pass "マイグレーションファイルが ${migration_count} 個存在します"
else
    check_fail "supabase/migrations ディレクトリが存在しません"
fi

echo ""

# Edge Functionsの確認
echo "6. Edge Functionsの確認"
echo "-------------------"

edge_functions=("chat-gpt" "generate-ai-report" "scheduled-report-generator" "send-report-email" "sync-to-sheets")

for func in "${edge_functions[@]}"; do
    if [ -f "supabase/functions/$func/index.ts" ]; then
        check_pass "$func 関数が存在します"
    else
        check_warn "$func 関数が存在しません"
    fi
done

echo ""

# TypeScriptエラーチェック
echo "7. TypeScriptエラーチェック"
echo "-------------------"

if npx tsc --noEmit > /dev/null 2>&1; then
    check_pass "TypeScriptエラーはありません"
else
    check_warn "TypeScriptエラーが存在します（警告のみの場合もあります）"
fi

echo ""

# 結果サマリー
echo "========================================="
echo "確認結果サマリー"
echo "========================================="
echo -e "${GREEN}成功: ${PASSED}${NC}"
echo -e "${YELLOW}警告: ${WARNING}${NC}"
echo -e "${RED}失敗: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 本番環境デプロイの準備ができています！${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}! いくつかの問題があります。修正後にデプロイしてください。${NC}"
    exit 1
else
    echo -e "${RED}✗ 重大な問題があります。デプロイ前に必ず修正してください。${NC}"
    exit 1
fi
