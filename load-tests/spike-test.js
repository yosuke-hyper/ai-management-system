import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// スパイクテスト設定 - 急激な負荷増加への対応
export const options = {
  stages: [
    { duration: '10s', target: 0 },    // 平常時
    { duration: '5s', target: 500 },   // 急激なスパイク！
    { duration: '30s', target: 500 },  // 維持
    { duration: '10s', target: 0 },    // 急激に減少
    { duration: '10s', target: 0 },    // 平常時
    { duration: '5s', target: 500 },   // 2回目のスパイク
    { duration: '30s', target: 500 },  // 維持
    { duration: '10s', target: 0 },    // クールダウン
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'errors': ['rate<0.1'], // スパイク時は10%まで許容
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';

export default function () {
  const res = http.get(`${BASE_URL}/dashboard/daily`);

  check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  }) || errorRate.add(1);

  sleep(0.5);
}
