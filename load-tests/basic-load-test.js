import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');

// テスト設定
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // 0→20ユーザーへ徐々に増加（ウォームアップ）
    { duration: '5m', target: 100 },  // 20→100ユーザーへ増加
    { duration: '5m', target: 100 },  // 100ユーザーを維持
    { duration: '2m', target: 0 },    // 100→0へ減少（クールダウン）
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95%のリクエストが2秒以内
    'errors': ['rate<0.01'],              // エラー率1%未満
    'http_req_failed': ['rate<0.01'],     // リクエスト失敗率1%未満
  },
};

// 環境変数
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

// テストデータ
const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'LoadTest123!',
};

// セットアップ（1回だけ実行）
export function setup() {
  console.log('Starting load test...');
  console.log(`BASE_URL: ${BASE_URL}`);
  return { startTime: Date.now() };
}

// メインテスト（各仮想ユーザーが実行）
export default function (data) {
  // 1. ログイン
  const loginRes = http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  const authToken = loginRes.json('access_token');
  const authHeaders = {
    'Authorization': `Bearer ${authToken}`,
    'apikey': SUPABASE_ANON_KEY,
  };

  sleep(1);

  // 2. ダッシュボードデータ取得
  const dashboardRes = http.get(`${BASE_URL}/dashboard/daily`, {
    headers: authHeaders,
  });

  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(2);

  // 3. レポート一覧取得
  const reportsRes = http.get(
    `${SUPABASE_URL}/rest/v1/daily_reports?select=*&limit=50`,
    { headers: authHeaders }
  );

  check(reportsRes, {
    'reports loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 4. 店舗一覧取得
  const storesRes = http.get(
    `${SUPABASE_URL}/rest/v1/stores?select=*`,
    { headers: authHeaders }
  );

  check(storesRes, {
    'stores loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // 5. 月次データ取得
  const monthlyRes = http.get(
    `${SUPABASE_URL}/rest/v1/monthly_expenses?select=*&limit=12`,
    { headers: authHeaders }
  );

  check(monthlyRes, {
    'monthly data loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// クリーンアップ（1回だけ実行）
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}
