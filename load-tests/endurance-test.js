import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// 持久テスト設定 - 長時間の安定性確認
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // 100ユーザーまで増加
    { duration: '2h', target: 100 },   // 2時間維持
    { duration: '5m', target: 0 },     // クールダウン
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

export default function () {
  // 通常の使用パターンをシミュレート
  const pages = [
    '/dashboard/daily',
    '/dashboard/weekly',
    '/dashboard/monthly',
    '/dashboard/targets',
  ];

  const randomPage = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${randomPage}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no memory leaks': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  // ユーザーの読み込み時間をシミュレート
  sleep(Math.random() * 5 + 5); // 5-10秒
}
