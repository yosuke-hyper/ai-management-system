import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const statusCodes = {
  '200': new Counter('status_200'),
  '201': new Counter('status_201'),
  '204': new Counter('status_204'),
  '401': new Counter('status_401'),
  '403': new Counter('status_403'),
  '404': new Counter('status_404'),
  '429': new Counter('status_429'),
  '500': new Counter('status_500'),
  '502': new Counter('status_502'),
  '503': new Counter('status_503'),
  'other': new Counter('status_other'),
};

const publicReadDuration = new Trend('public_read_duration');
const edgeFunctionDuration = new Trend('edge_function_duration');

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2MzUxNTgsImV4cCI6MjA0MzIxMTE1OH0.B0GIqEENTgfR-WP4GcTjL3fvdsKaFxgRjHPRq2akjLQ';

export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '1s', target: 100 },
    { duration: '10s', target: 100 },
    { duration: '1s', target: 500 },
    { duration: '60s', target: 500 },
    { duration: '10s', target: 100 },
    { duration: '10s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'public_read_duration': ['p(95)<2000'],
    'edge_function_duration': ['p(95)<3000'],
    'status_500': ['count<10'],
    'status_502': ['count<10'],
    'status_503': ['count<10'],
  },
};

function recordStatus(status) {
  const statusStr = String(status);
  if (statusCodes[statusStr]) {
    statusCodes[statusStr].add(1);
  } else {
    statusCodes['other'].add(1);
  }
}

export default function () {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const scenario = Math.random();

  if (scenario < 0.6) {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/subscription_plans?select=id,name,monthly_price,annual_price,max_stores,ai_reports_per_month&order=monthly_price.asc&limit=10`,
      { headers, tags: { name: 'public_read_subscription_plans' } }
    );

    recordStatus(res.status);
    publicReadDuration.add(res.timings.duration);

    check(res, {
      'subscription_plans: status 200': (r) => r.status === 200,
      'subscription_plans: has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) && body.length > 0;
        } catch {
          return false;
        }
      },
      'subscription_plans: response < 1s': (r) => r.timings.duration < 1000,
    });

  } else if (scenario < 0.85) {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/avatar_items?select=id,name,category,image_url,is_default&order=category.asc&limit=20`,
      { headers, tags: { name: 'public_read_avatar_items' } }
    );

    recordStatus(res.status);
    publicReadDuration.add(res.timings.duration);

    check(res, {
      'avatar_items: status 200': (r) => r.status === 200,
      'avatar_items: response < 1s': (r) => r.timings.duration < 1000,
    });

  } else {
    const res = http.get(
      `${SUPABASE_URL}/functions/v1/health-check`,
      { headers, tags: { name: 'edge_function_health' } }
    );

    recordStatus(res.status);
    edgeFunctionDuration.add(res.timings.duration);

    check(res, {
      'health-check: status 200': (r) => r.status === 200,
      'health-check: response < 2s': (r) => r.timings.duration < 2000,
    });
  }

  sleep(0.3);
}

export function handleSummary(data) {
  const now = new Date().toISOString();

  const getMetricValue = (name, stat) => {
    if (data.metrics[name] && data.metrics[name].values) {
      return data.metrics[name].values[stat] || 0;
    }
    return 0;
  };

  const getCounterValue = (name) => {
    if (data.metrics[name] && data.metrics[name].values) {
      return data.metrics[name].values.count || 0;
    }
    return 0;
  };

  const status200 = getCounterValue('status_200');
  const status201 = getCounterValue('status_201');
  const status204 = getCounterValue('status_204');
  const status401 = getCounterValue('status_401');
  const status403 = getCounterValue('status_403');
  const status404 = getCounterValue('status_404');
  const status429 = getCounterValue('status_429');
  const status500 = getCounterValue('status_500');
  const status502 = getCounterValue('status_502');
  const status503 = getCounterValue('status_503');
  const statusOther = getCounterValue('status_other');

  const totalRequests = status200 + status201 + status204 + status401 + status403 +
                       status404 + status429 + status500 + status502 + status503 + statusOther;
  const successRequests = status200 + status201 + status204;
  const successRate = totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) : 0;
  const errorRate = totalRequests > 0 ? (((status500 + status502 + status503) / totalRequests) * 100).toFixed(4) : 0;

  const publicP50 = getMetricValue('public_read_duration', 'med');
  const publicP95 = getMetricValue('public_read_duration', 'p(95)');
  const publicAvg = getMetricValue('public_read_duration', 'avg');
  const publicMax = getMetricValue('public_read_duration', 'max');

  const edgeP50 = getMetricValue('edge_function_duration', 'med');
  const edgeP95 = getMetricValue('edge_function_duration', 'p(95)');
  const edgeAvg = getMetricValue('edge_function_duration', 'avg');
  const edgeMax = getMetricValue('edge_function_duration', 'max');

  const httpDuration = data.metrics['http_req_duration'] ? data.metrics['http_req_duration'].values : {};
  const iterations = data.metrics['iterations'] ? data.metrics['iterations'].values.count : 0;
  const vusMax = data.metrics['vus_max'] ? data.metrics['vus_max'].values.max : 0;
  const throughput = data.metrics['http_reqs'] ? data.metrics['http_reqs'].values.rate : 0;

  const publicReadPassed = publicP95 < 2000;
  const edgeFunctionPassed = edgeP95 < 3000;
  const serverErrorsPassed = (status500 + status502 + status503) < 10;
  const successRatePassed = parseFloat(successRate) >= 95;

  const allPassed = publicReadPassed && edgeFunctionPassed && serverErrorsPassed && successRatePassed;

  const summary = `
================================================================================
                         SPIKE TEST v2 - DETAILED RESULTS
================================================================================
Test Time: ${now}
Target: ${SUPABASE_URL}
Max VUs: ${vusMax}
Total Iterations: ${iterations}

--------------------------------------------------------------------------------
                              STATUS CODE BREAKDOWN
--------------------------------------------------------------------------------
  2xx Success:
    200 OK:              ${status200.toLocaleString()}
    201 Created:         ${status201.toLocaleString()}
    204 No Content:      ${status204.toLocaleString()}

  4xx Client Errors:
    401 Unauthorized:    ${status401.toLocaleString()}
    403 Forbidden:       ${status403.toLocaleString()}
    404 Not Found:       ${status404.toLocaleString()}
    429 Rate Limited:    ${status429.toLocaleString()}

  5xx Server Errors:
    500 Internal Error:  ${status500.toLocaleString()}
    502 Bad Gateway:     ${status502.toLocaleString()}
    503 Unavailable:     ${status503.toLocaleString()}

  Other:                 ${statusOther.toLocaleString()}

  TOTAL:                 ${totalRequests.toLocaleString()}
  SUCCESS RATE:          ${successRate}%
  SERVER ERROR RATE:     ${errorRate}%

--------------------------------------------------------------------------------
                           RESPONSE TIME BY ENDPOINT TYPE
--------------------------------------------------------------------------------
  Public Read (subscription_plans, avatar_items):
    Median (p50):        ${publicP50.toFixed(2)} ms
    p95:                 ${publicP95.toFixed(2)} ms
    Average:             ${publicAvg.toFixed(2)} ms
    Max:                 ${publicMax.toFixed(2)} ms
    Threshold (p95<2s):  ${publicReadPassed ? 'PASSED' : 'FAILED'}

  Edge Function (health-check):
    Median (p50):        ${edgeP50.toFixed(2)} ms
    p95:                 ${edgeP95.toFixed(2)} ms
    Average:             ${edgeAvg.toFixed(2)} ms
    Max:                 ${edgeMax.toFixed(2)} ms
    Threshold (p95<3s):  ${edgeFunctionPassed ? 'PASSED' : 'FAILED'}

  Overall HTTP Duration:
    Median:              ${(httpDuration.med || 0).toFixed(2)} ms
    p95:                 ${(httpDuration['p(95)'] || 0).toFixed(2)} ms
    Average:             ${(httpDuration.avg || 0).toFixed(2)} ms
    Max:                 ${(httpDuration.max || 0).toFixed(2)} ms

--------------------------------------------------------------------------------
                              THROUGHPUT & CAPACITY
--------------------------------------------------------------------------------
  Requests/sec:          ${throughput.toFixed(2)}
  Total Requests:        ${totalRequests.toLocaleString()}

--------------------------------------------------------------------------------
                              THRESHOLD EVALUATION
--------------------------------------------------------------------------------
  [${publicReadPassed ? 'PASS' : 'FAIL'}] Public Read p95 < 2000ms (actual: ${publicP95.toFixed(0)}ms)
  [${edgeFunctionPassed ? 'PASS' : 'FAIL'}] Edge Function p95 < 3000ms (actual: ${edgeP95.toFixed(0)}ms)
  [${serverErrorsPassed ? 'PASS' : 'FAIL'}] Server Errors (5xx) < 10 (actual: ${status500 + status502 + status503})
  [${successRatePassed ? 'PASS' : 'FAIL'}] Success Rate >= 95% (actual: ${successRate}%)

================================================================================
                              OVERALL RESULT: ${allPassed ? 'PASSED' : 'FAILED'}
================================================================================
${!allPassed ? `
FAILURE ANALYSIS:
${!publicReadPassed ? '  - Public Read endpoints too slow under spike load\n' : ''}${!edgeFunctionPassed ? '  - Edge Functions too slow under spike load\n' : ''}${!serverErrorsPassed ? '  - Too many server errors (system instability)\n' : ''}${!successRatePassed ? '  - Success rate below acceptable threshold\n' : ''}
` : ''}
`;

  console.log(summary);

  return {
    'stdout': summary,
    'spike-test-v2-results.json': JSON.stringify({
      timestamp: now,
      target: SUPABASE_URL,
      maxVUs: vusMax,
      totalIterations: iterations,
      statusCodes: {
        '200': status200,
        '201': status201,
        '204': status204,
        '401': status401,
        '403': status403,
        '404': status404,
        '429': status429,
        '500': status500,
        '502': status502,
        '503': status503,
        'other': statusOther,
      },
      successRate: parseFloat(successRate),
      serverErrorRate: parseFloat(errorRate),
      responseTimes: {
        publicRead: { p50: publicP50, p95: publicP95, avg: publicAvg, max: publicMax },
        edgeFunction: { p50: edgeP50, p95: edgeP95, avg: edgeAvg, max: edgeMax },
        overall: httpDuration,
      },
      throughput: throughput,
      thresholds: {
        publicReadPassed,
        edgeFunctionPassed,
        serverErrorsPassed,
        successRatePassed,
        allPassed,
      },
    }, null, 2),
  };
}
