import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.loadtest');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return vars;
  } catch (e) {
    return {};
  }
}

const env = loadEnvFile();

const SUPABASE_URL = env.SUPABASE_URL || 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';
const TEST_USER_EMAIL = env.TEST_USER_EMAIL || 'loadtest2@foodvalue-ai.test';
const TEST_USER_PASSWORD = env.TEST_USER_PASSWORD || 'LoadTest2025Secure';
const TEST_ORG_ID = env.TEST_ORG_ID || 'f849a583-dde9-46c5-bc48-5f16c3f038b9';

let TEST_STORE_ID = null;
let TEST_USER_ID = null;

const results = {
  reads: { requests: 0, successes: 0, failures: 0, times: [] },
  writes: { requests: 0, successes: 0, failures: 0, times: [] },
  aggregations: { requests: 0, successes: 0, failures: 0, times: [] },
  all: { requests: 0, successes: 0, failures: 0, times: [] },
  startTime: null,
  endTime: null,
  intervals: [],
};

let accessToken = null;

function makeRequest(endpoint, method = 'GET', body = null, category = 'reads', extraHeaders = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(endpoint, SUPABASE_URL);

    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        results[category].requests++;
        results[category].times.push(responseTime);
        results.all.requests++;
        results.all.times.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          results[category].successes++;
          results.all.successes++;
        } else {
          results[category].failures++;
          results.all.failures++;
        }
        resolve({ statusCode: res.statusCode, responseTime, success: res.statusCode < 300, data });
      });
    });

    req.on('error', (e) => {
      const responseTime = Date.now() - startTime;
      results[category].requests++;
      results[category].failures++;
      results[category].times.push(responseTime);
      results.all.requests++;
      results.all.failures++;
      results.all.times.push(responseTime);
      resolve({ error: e.message, responseTime, success: false });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      results[category].requests++;
      results[category].failures++;
      results.all.requests++;
      results.all.failures++;
      resolve({ error: 'timeout', responseTime: 15000, success: false });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function authenticate() {
  console.log(`  Authenticating test user: ${TEST_USER_EMAIL}...`);

  const res = await makeRequest(
    '/auth/v1/token?grant_type=password',
    'POST',
    { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD },
    'reads'
  );

  if (res.success && res.data) {
    try {
      const parsed = JSON.parse(res.data);
      if (parsed.access_token) {
        accessToken = parsed.access_token;
        TEST_USER_ID = parsed.user?.id;
        console.log('  Authentication successful');
        console.log(`  User ID: ${TEST_USER_ID}`);
        return true;
      }
    } catch (e) {
      console.log(`  Parse error: ${e.message}`);
    }
  }

  console.log(`  Authentication failed (status: ${res.statusCode}) - using anon key for public endpoints`);
  return false;
}

async function fetchTestStoreId() {
  if (!accessToken) return null;

  const res = await makeRequest(
    `/rest/v1/stores?select=id&organization_id=eq.${TEST_ORG_ID}&limit=1`,
    'GET',
    null,
    'reads'
  );

  if (res.success && res.data) {
    try {
      const parsed = JSON.parse(res.data);
      if (parsed && parsed.length > 0) {
        TEST_STORE_ID = parsed[0].id;
        console.log(`  Found test store: ${TEST_STORE_ID}`);
        return TEST_STORE_ID;
      }
    } catch (e) {}
  }

  console.log('  No test store found - using fallback');
  return null;
}

async function runReadOperations() {
  const endpoints = [
    `/rest/v1/daily_reports?select=*&organization_id=eq.${TEST_ORG_ID}&limit=50`,
    `/rest/v1/stores?select=*&organization_id=eq.${TEST_ORG_ID}`,
    `/rest/v1/targets?select=*&organization_id=eq.${TEST_ORG_ID}&limit=12`,
    `/rest/v1/monthly_expenses?select=*&organization_id=eq.${TEST_ORG_ID}&limit=12`,
  ];

  for (const endpoint of endpoints) {
    await makeRequest(endpoint, 'GET', null, 'reads');
    await new Promise(r => setTimeout(r, 20));
  }
}

async function runAggregationOperations() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthStart = lastMonth.toISOString().split('T')[0];

  const endpoints = [
    `/rest/v1/daily_reports?select=date,sales,purchase,labor_cost,utilities,customers&organization_id=eq.${TEST_ORG_ID}&date=gte.${startOfMonth}&date=lte.${endOfMonth}`,
    `/rest/v1/daily_reports?select=store_id,date,sales,purchase,customers&organization_id=eq.${TEST_ORG_ID}&date=gte.${lastMonthStart}&limit=100`,
    `/rest/v1/targets?select=*&organization_id=eq.${TEST_ORG_ID}`,
  ];

  for (const endpoint of endpoints) {
    await makeRequest(endpoint, 'GET', null, 'aggregations');
    await new Promise(r => setTimeout(r, 20));
  }
}

async function runWriteOperations() {
  if (!TEST_STORE_ID || !accessToken) {
    return;
  }

  const today = new Date();
  const testDate = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const dateStr = testDate.toISOString().split('T')[0];

  const operationTypes = ['lunch', 'dinner'];
  const opType = operationTypes[Math.floor(Math.random() * 2)];

  const reportData = {
    store_id: TEST_STORE_ID,
    organization_id: TEST_ORG_ID,
    user_id: TEST_USER_ID,
    date: dateStr,
    operation_type: opType,
    sales: Math.floor(50000 + Math.random() * 150000),
    purchase: Math.floor(15000 + Math.random() * 45000),
    labor_cost: Math.floor(10000 + Math.random() * 30000),
    utilities: Math.floor(5000 + Math.random() * 15000),
    customers: Math.floor(20 + Math.random() * 80),
  };

  await makeRequest(
    '/rest/v1/daily_reports',
    'POST',
    reportData,
    'writes',
    { 'Prefer': 'resolution=merge-duplicates' }
  );
}

async function runUserSession() {
  await runReadOperations();
  await runAggregationOperations();
  if (Math.random() < 0.3) {
    await runWriteOperations();
  }
}

async function runConcurrentUsers(userCount) {
  const promises = [];
  for (let i = 0; i < userCount; i++) {
    promises.push(runUserSession());
  }
  await Promise.all(promises);
}

function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function recordInterval() {
  const now = Date.now();
  const elapsed = (now - results.startTime) / 1000;
  const reqs = results.all.requests;
  const lastInterval = results.intervals[results.intervals.length - 1];
  const lastReqs = lastInterval ? lastInterval.totalRequests : 0;
  const intervalReqs = reqs - lastReqs;

  results.intervals.push({
    elapsed: Math.floor(elapsed),
    totalRequests: reqs,
    intervalRequests: intervalReqs,
    errors: results.all.failures,
  });
}

function printCategoryResults(name, stats) {
  if (stats.requests === 0) return;

  const errorRate = (stats.failures / stats.requests) * 100;
  const avgTime = stats.times.length > 0
    ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(0)
    : 0;
  const p95 = calculatePercentile(stats.times, 95);
  const p99 = calculatePercentile(stats.times, 99);

  console.log(`  ${name.padEnd(15)} | Reqs: ${String(stats.requests).padStart(6)} | OK: ${String(stats.successes).padStart(6)} | Fail: ${String(stats.failures).padStart(4)} | Err: ${errorRate.toFixed(1).padStart(5)}% | Avg: ${String(avgTime).padStart(4)}ms | P95: ${String(p95).padStart(4)}ms | P99: ${String(p99).padStart(4)}ms`);
}

function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = results.all.requests / duration;
  const errorRate = results.all.requests > 0 ? (results.all.failures / results.all.requests) * 100 : 0;

  console.log('\n' + '='.repeat(120));
  console.log('  AUTHENTICATED LOAD TEST RESULTS');
  console.log('='.repeat(120));
  console.log(`  Duration:         ${duration.toFixed(0)}s (${(duration / 60).toFixed(1)} minutes)`);
  console.log(`  Total Requests:   ${results.all.requests}`);
  console.log(`  Throughput:       ${rps.toFixed(2)} req/s`);
  console.log(`  Total Errors:     ${results.all.failures} (${errorRate.toFixed(2)}%)`);
  console.log('-'.repeat(120));

  console.log('  Category Breakdown:');
  printCategoryResults('Reads (RLS)', results.reads);
  printCategoryResults('Aggregations', results.aggregations);
  printCategoryResults('Writes (UPSERT)', results.writes);
  console.log('-'.repeat(120));

  console.log('  Overall Response Times:');
  const minTime = results.all.times.length > 0 ? Math.min(...results.all.times) : 0;
  const maxTime = results.all.times.length > 0 ? Math.max(...results.all.times) : 0;
  const avgTime = results.all.times.length > 0
    ? (results.all.times.reduce((a, b) => a + b, 0) / results.all.times.length).toFixed(2)
    : 0;
  const p50 = calculatePercentile(results.all.times, 50);
  const p95 = calculatePercentile(results.all.times, 95);
  const p99 = calculatePercentile(results.all.times, 99);

  console.log(`  Min: ${minTime}ms | Max: ${maxTime}ms | Avg: ${avgTime}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);
  console.log('-'.repeat(120));

  console.log('  Throughput Over Time (30s intervals):');
  for (let i = 0; i < results.intervals.length; i += 2) {
    const int = results.intervals[i];
    const rpsInt = int.intervalRequests / 30;
    const bar = '#'.repeat(Math.min(50, Math.floor(rpsInt)));
    console.log(`  ${String(int.elapsed).padStart(4)}s: ${bar} ${rpsInt.toFixed(1)} req/s (total: ${int.totalRequests})`);
  }
  console.log('-'.repeat(120));

  const p95Pass = p95 < 500;
  const p99Pass = p99 < 1000;
  const errorPass = errorRate < 1;

  console.log('  Thresholds:');
  console.log(`  P95 < 500ms:      ${p95Pass ? 'PASS' : 'FAIL'} (actual: ${p95}ms)`);
  console.log(`  P99 < 1000ms:     ${p99Pass ? 'PASS' : 'FAIL'} (actual: ${p99}ms)`);
  console.log(`  Error Rate < 1%:  ${errorPass ? 'PASS' : 'FAIL'} (actual: ${errorRate.toFixed(2)}%)`);
  console.log('-'.repeat(120));

  const overall = p95Pass && p99Pass && errorPass;
  console.log(`  VERDICT:          ${overall ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(120));

  return {
    duration,
    requests: results.all.requests,
    rps,
    errorRate,
    p50,
    p95,
    p99,
    reads: { ...results.reads, p95: calculatePercentile(results.reads.times, 95) },
    writes: { ...results.writes, p95: calculatePercentile(results.writes.times, 95) },
    aggregations: { ...results.aggregations, p95: calculatePercentile(results.aggregations.times, 95) },
    pass: overall,
  };
}

async function main() {
  const TEST_DURATION_MINUTES = 10;
  const USERS_PER_BATCH = 30;
  const BATCH_INTERVAL_MS = 2000;

  console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    FoodValue AI - Authenticated Production Load Test                                               ║');
  console.log('║                    JWT + RLS + Write Operations + Aggregations                                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log(`\nTest Configuration:`);
  console.log(`  Duration:         ${TEST_DURATION_MINUTES} minutes`);
  console.log(`  Concurrent Users: ${USERS_PER_BATCH} per batch`);
  console.log(`  Batch Interval:   ${BATCH_INTERVAL_MS}ms`);
  console.log(`  Test Org ID:      ${TEST_ORG_ID}`);
  console.log(`  Test Store ID:    ${TEST_STORE_ID}`);
  console.log('\nOperations Under Test:');
  console.log('  - READ:  daily_reports, stores, targets, monthly_expenses (with RLS)');
  console.log('  - AGGR:  monthly summaries, KPI calculations');
  console.log('  - WRITE: daily_reports UPSERT (30% of sessions)');

  console.log('\n[SETUP] Initializing...');
  const authSuccess = await authenticate();
  if (authSuccess) {
    await fetchTestStoreId();
  }
  console.log(`  Test Store ID:    ${TEST_STORE_ID || '(none - writes disabled)'}`);

  console.log('\n[RUNNING] Starting 10-minute steady load test...');
  results.startTime = Date.now();
  const endTime = results.startTime + (TEST_DURATION_MINUTES * 60 * 1000);

  let batchCount = 0;
  const intervalId = setInterval(recordInterval, 30000);

  while (Date.now() < endTime) {
    batchCount++;
    const elapsed = Math.floor((Date.now() - results.startTime) / 1000);
    const remaining = Math.ceil((endTime - Date.now()) / 1000);

    process.stdout.write(`\r  Batch ${batchCount} | Elapsed: ${elapsed}s | Remaining: ${remaining}s | Requests: ${results.all.requests} | Errors: ${results.all.failures}    `);

    await runConcurrentUsers(USERS_PER_BATCH);
    await new Promise(r => setTimeout(r, BATCH_INTERVAL_MS));
  }

  clearInterval(intervalId);
  results.endTime = Date.now();
  recordInterval();

  console.log('\n\n[COMPLETE] Test finished');

  const testResults = printResults();

  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  if (testResults.pass) {
    console.log('║                    FINAL VERDICT: PASS - Production Ready                                                          ║');
  } else {
    console.log('║                    FINAL VERDICT: REVIEW REQUIRED                                                                  ║');
  }
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nCompleted: ${new Date().toISOString()}`);

  return testResults.pass ? 0 : 1;
}

main().then(code => {
  process.exitCode = code;
});
