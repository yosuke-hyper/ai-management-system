#!/bin/bash

# 負荷テスト実行スクリプト
# すべてのテストを順番に実行します

set -e  # エラーが発生したら停止

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  負荷テスト実行開始${NC}"
echo -e "${GREEN}========================================${NC}"

# 環境変数チェック
if [ ! -f .env.loadtest ]; then
    echo -e "${RED}エラー: .env.loadtest ファイルが見つかりません${NC}"
    echo "以下の内容で .env.loadtest を作成してください："
    echo ""
    echo "BASE_URL=https://your-app.netlify.app"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_ANON_KEY=your-anon-key"
    exit 1
fi

# 環境変数読み込み
export $(cat .env.loadtest | xargs)

echo -e "${YELLOW}テスト対象: ${BASE_URL}${NC}"
echo ""

# 結果ディレクトリ作成
mkdir -p results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 1. 基本負荷テスト
echo -e "${GREEN}[1/4] 基本負荷テスト実行中...${NC}"
echo "目標: 100同時ユーザー"
k6 run \
  --env BASE_URL=$BASE_URL \
  --env SUPABASE_URL=$SUPABASE_URL \
  --env SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  --out json=results/basic-load-${TIMESTAMP}.json \
  basic-load-test.js

echo -e "${GREEN}✓ 基本負荷テスト完了${NC}"
echo ""
sleep 10

# 2. ストレステスト
echo -e "${GREEN}[2/4] ストレステスト実行中...${NC}"
echo "目標: 1000同時ユーザー"
k6 run \
  --env BASE_URL=$BASE_URL \
  --out json=results/stress-${TIMESTAMP}.json \
  stress-test.js

echo -e "${GREEN}✓ ストレステスト完了${NC}"
echo ""
sleep 10

# 3. スパイクテスト
echo -e "${GREEN}[3/4] スパイクテスト実行中...${NC}"
echo "目標: 0→500ユーザー（5秒）"
k6 run \
  --env BASE_URL=$BASE_URL \
  --out json=results/spike-${TIMESTAMP}.json \
  spike-test.js

echo -e "${GREEN}✓ スパイクテスト完了${NC}"
echo ""

# 4. 持久テストはスキップ（時間がかかるため）
echo -e "${YELLOW}[4/4] 持久テストはスキップされました${NC}"
echo "持久テストを実行する場合は以下を実行してください："
echo "k6 run --env BASE_URL=$BASE_URL endurance-test.js"
echo ""

# 結果サマリー
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  すべてのテスト完了！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "結果ファイル:"
ls -lh results/*${TIMESTAMP}*
echo ""
echo "詳細レポートを生成する場合："
echo "k6 report results/basic-load-${TIMESTAMP}.json --out html"
