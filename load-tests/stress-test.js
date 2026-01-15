import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// ストレステスト設定 - システムの限界を探る
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // ウォームアップ
    { duration: '5m', target: 200 },   // 急激に増加
    { duration: '5m', target: 500 },   // さらに増加
    { duration: '5m', target: 1000 },  // 限界に挑戦
    { duration: '5m', target: 1000 },  // 維持
    { duration: '5m', target: 0 },     // クールダウン
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // ストレス下なので緩和
    'errors': ['rate<0.05'],              // エラー率5%未満
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

export default function () {
  // シンプルなGETリクエスト
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
